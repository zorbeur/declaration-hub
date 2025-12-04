import os
import json
import subprocess
import secrets
import hashlib
from pathlib import Path
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    DeclarationSerializer,
    ActivityLogSerializer,
    AdminProfileSerializer,
    AttachmentSerializer,
    ClueSerializer,
    ProtectionSettingsSerializer,
    PendingDeclarationSerializer,
    AdminSessionSerializer,
)
from .models import (
    Declaration,
    PasswordResetToken,
    ActivityLog,
    AdminProfile,
    TwoFactorToken,
    Attachment,
    Clue,
    ProtectionSettings,
    PendingDeclaration,
    AdminSession,
)
from .metrics import counters
from django_ratelimit.core import is_ratelimited


def send_email_via_node(to, subject, text, html=None):
    payload = {"to": to, "subject": subject, "text": text, "html": html}
    API_DIR = Path(__file__).resolve().parent.parent
    mail_js = os.path.join(API_DIR, 'mail.js')
    try:
        p = subprocess.run(['node', mail_js], input=json.dumps(payload).encode('utf-8'), capture_output=True, timeout=15)
        if p.returncode != 0:
            # log stderr
            print('mail.js stderr:', p.stderr.decode())
            return False
        return True
    except Exception as e:
        print('Error calling mail.js', e)
        return False


class RegisterAPIView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        try:
            user = serializer.save()
            # create verification token (24 heures)
            token = secrets.token_urlsafe(32)
            PasswordResetToken.create_for_user(user, token, ttl_seconds=24 * 3600)
            # send email via node script
            subject = 'Vérifiez votre email'
            text = f"Code de vérification: {token}\nValide 24 heures."
            send_email_via_node(user.email, subject, text)
        except Exception as e:
            import logging
            logging.error(f"Erreur inscription: {e}")
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': f'Erreur serveur: {str(e)}'})


from pathlib import Path


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)  # Authentification requise

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Retourne l'utilisateur actuellement authentifié"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enable_2fa(self, request, pk=None):
        user = self.get_object()
        profile, _ = AdminProfile.objects.get_or_create(user=user)
        profile.two_factor_enabled = True
        profile.save()
        
        # Log action
        ActivityLog.log_action(
            user=request.user if request.user.is_authenticated else None,
            action='ENABLE_2FA',
            resource_type='User',
            resource_id=user.id,
            details=json.dumps({
                'username': user.username,
                'target_user_id': user.id,
            }),
            request=request,
            is_sensitive=True
        )
        
        return Response({'detail': '2FA enabled'})

    @action(detail=True, methods=['post'])
    def disable_2fa(self, request, pk=None):
        user = self.get_object()
        profile, _ = AdminProfile.objects.get_or_create(user=user)
        profile.two_factor_enabled = False
        profile.save()
        
        # Log action
        ActivityLog.log_action(
            user=request.user if request.user.is_authenticated else None,
            action='DISABLE_2FA',
            resource_type='User',
            resource_id=user.id,
            details=json.dumps({
                'username': user.username,
                'target_user_id': user.id,
            }),
            request=request,
            is_sensitive=True
        )
        
        return Response({'detail': '2FA disabled'})


class DeclarationViewSet(viewsets.ModelViewSet):
    queryset = Declaration.objects.all().order_by('-created_at')
    serializer_class = DeclarationSerializer

    def get_permissions(self):
        # GET et POST sont publics, PUT/DELETE nécessitent authentification
        if self.request.method in ['GET', 'HEAD', 'OPTIONS', 'POST']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        """Log update operations with old and new values"""
        old_instance = self.get_object()
        old_data = DeclarationSerializer(old_instance).data
        
        # Save the updated instance
        instance = serializer.save()
        new_data = DeclarationSerializer(instance).data
        
        # Calculate changed fields
        changed_fields = {}
        for key in old_data:
            if old_data.get(key) != new_data.get(key):
                changed_fields[key] = {
                    'old': old_data.get(key),
                    'new': new_data.get(key)
                }
        
        # Log the action
        ActivityLog.log_action(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='UPDATE',
            resource_type='Declaration',
            resource_id=instance.id,
            details=json.dumps({
                'tracking_code': instance.tracking_code,
                'changed_fields': changed_fields,
            }),
            request=self.request,
            is_sensitive=bool(changed_fields)
        )

    def perform_destroy(self, instance):
        """Log delete operations with full instance data"""
        # Capture data before deletion
        instance_data = DeclarationSerializer(instance).data
        
        # Delete the instance
        instance.delete()
        
        # Log the action
        ActivityLog.log_action(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='DELETE',
            resource_type='Declaration',
            resource_id=instance_data.get('id'),
            details=json.dumps({
                'tracking_code': instance_data.get('tracking_code'),
                'type': instance_data.get('type'),
                'location': instance_data.get('location'),
            }),
            request=self.request,
            is_sensitive=True
        )

    def create(self, request, *args, **kwargs):
        """Create declaration with protection checks (rate-limit, CAPTCHA, blacklist)"""
        # Load current protection settings
        p = ProtectionSettings.get_solo()

        # IP blacklist
        ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR')
        if p.ip_blacklist:
            blacklist = [l.strip() for l in p.ip_blacklist.splitlines() if l.strip()]
            if ip in blacklist:
                return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # Rate limiting (only if enabled)
        if p.enable_rate_limit_declarations:
            try:
                limited = is_ratelimited(request, key='ip', rate=p.rate_limit_declarations, method='POST', increment=True)
            except Exception:
                limited = False
            if limited:
                counters.rate_limit_hits += 1
                return Response({'detail': 'Too Many Requests'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # CAPTCHA check if enabled
        if p.enable_captcha_declarations:
            recaptcha_token = request.data.get('recaptcha')
            if not recaptcha_token:
                return Response({'detail': 'CAPTCHA requis'}, status=status.HTTP_400_BAD_REQUEST)
            # Vérification Google reCAPTCHA v2
            import requests
            recaptcha_secret = getattr(settings, 'RECAPTCHA_SECRET', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe')
            verify_url = 'https://www.google.com/recaptcha/api/siteverify'
            payload = {'secret': recaptcha_secret, 'response': recaptcha_token}
            try:
                r = requests.post(verify_url, data=payload, timeout=5)
                result = r.json()
            except Exception:
                result = {'success': False}
            if not result.get('success'):
                counters.recaptcha_failures += 1
                return Response({'detail': 'CAPTCHA invalide'}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Accept client-generated id/tracking_code, otherwise generate here
        data = serializer.validated_data
        if 'id' not in data or not data.get('id'):
            serializer.validated_data['id'] = secrets.token_hex(16)
        if 'tracking_code' not in data or not data.get('tracking_code'):
            serializer.validated_data['tracking_code'] = secrets.token_urlsafe(12)
        # Audit: log IP et user agent
        ip = self.request.META.get('REMOTE_ADDR') or self.request.META.get('HTTP_X_FORWARDED_FOR')
        ua = self.request.META.get('HTTP_USER_AGENT', '')
        serializer.validated_data['ip_address'] = ip
        serializer.validated_data['browser_info'] = ua
        
        declaration = serializer.save()
        counters.declarations_created += 1
        
        # Log action
        ActivityLog.log_action(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='CREATE',
            resource_type='Declaration',
            resource_id=declaration.id,
            details=json.dumps({
                'tracking_code': declaration.tracking_code,
                'type': declaration.type,
                'location': declaration.location,
            }),
            request=self.request,
            is_sensitive=True
        )

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='by-code')
    def by_code(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({'detail': 'code missing'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            dec = Declaration.objects.get(tracking_code=code)
        except Declaration.DoesNotExist:
            return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(dec)
        return Response(serializer.data)



class VerifyEmailAPIView(generics.GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        token = request.data.get('token')
        if not token:
            return Response({'detail': 'token missing'}, status=status.HTTP_400_BAD_REQUEST)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        try:
            prt = PasswordResetToken.objects.get(token_hash=token_hash)
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        if prt.expires_at < timezone.now():
            prt.delete()
            return Response({'detail': 'token expired'}, status=status.HTTP_400_BAD_REQUEST)
        # Activer l'utilisateur
        user = prt.user
        user.is_active = True
        user.save()
        prt.delete()
        return Response({'detail': 'verified', 'username': user.username})


class ActivityLogViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = (IsAuthenticated,)  # Authentification requise

    @action(detail=False, methods=['post'])
    def clear(self, request):
        ActivityLog.objects.all().delete()
        return Response({'detail': 'cleared'})


class TwoFactorSendAPIView(generics.GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '').strip()
        if not username:
            return Response({'detail': 'username required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username=username)
            if not user.is_active:
                return Response({'detail': 'account not active'}, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({'detail': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        profile, _ = AdminProfile.objects.get_or_create(user=user)
        if not profile.two_factor_enabled:
            return Response({'detail': '2FA not enabled'}, status=status.HTTP_400_BAD_REQUEST)
        
        # generate 6-digit code
        code = str(secrets.randbelow(1000000)).zfill(6)
        TwoFactorToken.create_for_user(user, code, ttl_seconds=300)
        # send via mail.js
        subject = 'Votre code 2FA'
        text = f"Code: {code} (valide 5 minutes)"
        send_email_via_node(user.email, subject, text)
        return Response({'detail': 'code sent'})


class TwoFactorVerifyAPIView(generics.GenericAPIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '').strip()
        code = request.data.get('code', '').strip()
        if not username or not code:
            return Response({'detail': 'username and code required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username=username)
            if not user.is_active:
                return Response({'detail': 'account not active'}, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({'detail': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # find valid token
        now = timezone.now()
        tokens = TwoFactorToken.objects.filter(user=user, expires_at__gt=now).order_by('-created_at')
        valid = False
        for t in tokens:
            if t.is_valid(code):
                valid = True
                t.delete()
                break
        
        if not valid:
            # Log failed 2FA attempt
            ActivityLog.log_action(
                user=user,
                action='VERIFY_2FA_FAILED',
                resource_type='User',
                resource_id=user.id,
                details=json.dumps({'username': username}),
                request=request,
                is_sensitive=True
            )
            return Response({'detail': 'invalid code'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Log successful 2FA verification
        ActivityLog.log_action(
            user=user,
            action='VERIFY_2FA_SUCCESS',
            resource_type='User',
            resource_id=user.id,
            details=json.dumps({'username': username}),
            request=request,
            is_sensitive=True
        )
        
        # issue JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})


class BackupAPIView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'detail': 'admin required'}, status=status.HTTP_403_FORBIDDEN)
        
        # return all declarations, users (basic), and logs
        decs = Declaration.objects.all()
        logs = ActivityLog.objects.all()
        users = User.objects.all()
        from .serializers import DeclarationSerializer, ActivityLogSerializer, UserSerializer

        # Log backup action
        ActivityLog.log_action(
            user=request.user,
            action='BACKUP',
            resource_type='System',
            resource_id='system',
            details=json.dumps({
                'declarations_count': decs.count(),
                'users_count': users.count(),
                'logs_count': logs.count(),
            }),
            request=request,
            is_sensitive=True
        )

        return Response({
            'timestamp': timezone.now().isoformat(),
            'declarations': DeclarationSerializer(decs, many=True).data,
            'users': UserSerializer(users, many=True).data,
            'activity_logs': ActivityLogSerializer(logs, many=True).data,
        })

    def post(self, request, *args, **kwargs):
        # restore backup (admin only)
        if not request.user.is_staff:
            return Response({'detail': 'admin required'}, status=status.HTTP_403_FORBIDDEN)
        
        payload = request.data
        decs = payload.get('declarations', [])
        logs = payload.get('activity_logs', [])
        users = payload.get('users', [])
        
        # naive restore: create or update by id/username
        restored_count = {'users': 0, 'declarations': 0, 'logs': 0}
        
        for u in users:
            username = u.get('username')
            if not username:
                continue
            user, _ = User.objects.get_or_create(username=username, defaults={'email': u.get('email','')})
            restored_count['users'] += 1
            
        for d in decs:
            Declaration.objects.update_or_create(tracking_code=d.get('tracking_code'), defaults=d)
            restored_count['declarations'] += 1
            
        for l in logs:
            ActivityLog.objects.update_or_create(id=l.get('id'), defaults={
                'username': l.get('username',''),
                'action': l.get('action',''),
                'details': l.get('details',''),
            })
            restored_count['logs'] += 1
        
        # Log restore action
        ActivityLog.log_action(
            user=request.user,
            action='RESTORE',
            resource_type='System',
            resource_id='system',
            details=json.dumps(restored_count),
            request=request,
            is_sensitive=True
        )
        
        return Response({'detail': 'restored', 'restored': restored_count})


class AttachmentUploadAPIView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = AttachmentSerializer
    permission_classes = (AllowAny,)  # Les indices publics n'ont pas besoin d'auth

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file')
        if file_obj:
            attachment = serializer.save(
                id=secrets.token_hex(16),
                mime_type=file_obj.content_type,
                size=file_obj.size
            )
            
            # Log attachment upload
            ActivityLog.log_action(
                user=self.request.user if self.request.user.is_authenticated else None,
                action='UPLOAD',
                resource_type='Attachment',
                resource_id=attachment.id,
                details=json.dumps({
                    'filename': file_obj.name,
                    'size': file_obj.size,
                    'mime_type': file_obj.content_type,
                }),
                request=self.request,
                is_sensitive=True
            )
            
            return attachment


class PendingDeclarationViewSet(viewsets.ModelViewSet):
    """CRUD pour PendingDeclaration; admin can list/process pending client declarations."""
    queryset = PendingDeclaration.objects.all().order_by('-created_at')
    serializer_class = PendingDeclarationSerializer

    def get_permissions(self):
        # Allow clients to create pending declarations without auth (they originate from client offline sync)
        if self.request.method in ['POST', 'HEAD', 'OPTIONS']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # Generate id if absent
        data = serializer.validated_data
        if 'id' not in data or not data.get('id'):
            data['id'] = secrets.token_hex(16)
        # try to capture tracking_code if present in payload
        payload = data.get('payload', {})
        tracking_code = payload.get('tracking_code') or payload.get('trackingCode')
        serializer.save(id=data['id'], tracking_code=tracking_code)


class ClueViewSet(viewsets.ModelViewSet):
    queryset = Clue.objects.all()
    serializer_class = ClueSerializer
    permission_classes = (AllowAny,)  # Les indices publics peuvent être soumis sans auth
    filterset_fields = ['declaration']

    def get_queryset(self):
        queryset = Clue.objects.all()
        declaration_id = self.request.query_params.get('declaration_id')
        if declaration_id:
            queryset = queryset.filter(declaration_id=declaration_id)
        return queryset

    def perform_create(self, serializer):
        # Créer l'indice avec ID et timestamp
        clue = serializer.save(id=secrets.token_hex(16))
        
        # Log clue creation
        ActivityLog.log_action(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='CREATE',
            resource_type='Clue',
            resource_id=clue.id,
            details=json.dumps({
                'declaration_id': str(clue.declaration_id),
                'description_length': len(clue.description or ''),
            }),
            request=self.request,
            is_sensitive=True
        )

    def perform_update(self, serializer):
        """Log clue updates"""
        old_clue = self.get_object()
        old_data = ClueSerializer(old_clue).data
        
        # Save updated clue
        clue = serializer.save()
        new_data = ClueSerializer(clue).data
        
        # Calculate changed fields
        changed_fields = {}
        for key in old_data:
            if old_data.get(key) != new_data.get(key):
                changed_fields[key] = {
                    'old': old_data.get(key),
                    'new': new_data.get(key)
                }
        
        # Log clue update
        ActivityLog.log_action(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='UPDATE',
            resource_type='Clue',
            resource_id=clue.id,
            details=json.dumps(changed_fields),
            request=self.request,
            is_sensitive=True
        )

    def perform_destroy(self, instance):
        """Log clue deletion"""
        # Capture data before deletion
        instance_data = ClueSerializer(instance).data
        
        # Delete the clue
        instance.delete()
        
        # Log clue deletion
        ActivityLog.log_action(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='DELETE',
            resource_type='Clue',
            resource_id=instance_data.get('id'),
            details=json.dumps({'declaration_id': str(instance_data.get('declaration_id'))}),
            request=self.request,
            is_sensitive=True
        )

    def get_permissions(self):
        # POST est public (soumettre un indice), GET protégé (voir les indices en admin)
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]


class AdminSessionViewSet(viewsets.ModelViewSet):
    """CRUD pour AdminSession; admins can view/manage their sessions."""
    queryset = AdminSession.objects.all()
    serializer_class = AdminSessionSerializer
    permission_classes = (IsAuthenticated,)
    filterset_fields = ['user', 'created_at']
    
    @action(detail=False, methods=['post'])
    def heartbeat(self, request):
        """Update last_seen for current user's sessions. Used by frontend to keep session alive."""
        user = request.user
        ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR')
        ua = request.META.get('HTTP_USER_AGENT', '')
        
        # Try to find or create session for this user/IP combo
        session, created = AdminSession.objects.get_or_create(
            user=user,
            ip_address=ip,
            defaults={
                'user_agent': ua,
                'session_key': request.session.session_key if hasattr(request, 'session') else None,
            }
        )
        session.last_seen = timezone.now()
        session.save()
        
        serializer = self.get_serializer(session)
        return Response(serializer.data)


class SyncAPIView(generics.GenericAPIView):
    """Synchroniser les déclarations en attente du localStorage vers la DB

    Ce endpoint permet au client d'envoyer un batch de déclarations; celles-ci seront soit
    créées directement dans `Declaration`, soit stockées en `PendingDeclaration` si le
    payload nécessite une intervention (ex: conflit, validation manuelle).
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        """Accepter un batch de déclarations et les sauvegarder"""
        declarations = request.data.get('declarations', [])
        
        if not declarations or not isinstance(declarations, list):
            return Response(
                {'detail': 'declarations list required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        saved = []
        pending = []
        errors = []
        
        for dec_data in declarations:
            try:
                # Vérifier que la déclaration n'existe pas déjà
                tracking_code = dec_data.get('tracking_code')
                if tracking_code and Declaration.objects.filter(tracking_code=tracking_code).exists():
                    errors.append({
                        'tracking_code': tracking_code,
                        'error': 'Declaration already exists'
                    })
                    continue
                
                # Tenter de créer la déclaration
                serializer = DeclarationSerializer(data=dec_data)
                if serializer.is_valid():
                    serializer.save()
                    saved.append(dec_data.get('tracking_code') or serializer.instance.tracking_code)
                    counters.declarations_synced += 1
                else:
                    # Si validation échoue, sauvegarder en PendingDeclaration pour revue humaine
                    pd = PendingDeclaration.objects.create(
                        id=secrets.token_hex(16),
                        client_id=dec_data.get('id') or None,
                        payload=dec_data,
                        tracking_code=dec_data.get('tracking_code') or None,
                        error=json.dumps(serializer.errors)
                    )
                    pending.append(pd.id)
                    counters.pending_declarations_created += 1
            except Exception as e:
                # En cas d'erreur serveur, stocker en pending pour investigation
                pd = PendingDeclaration.objects.create(
                    id=secrets.token_hex(16),
                    client_id=dec_data.get('id') or None,
                    payload=dec_data,
                    tracking_code=dec_data.get('tracking_code') or None,
                    error=str(e)
                )
                pending.append(pd.id)
                counters.sync_errors += 1
                counters.pending_declarations_created += 1
        
        return Response({
            'created_count': len(saved),
            'pending_count': len(pending),
            'errors_count': len(errors),
            'created': saved,
            'pending_ids': pending,
            'errors': errors
        })


class ProtectionSettingsAPIView(generics.GenericAPIView):
    """GET/PUT protection settings (admin only)"""
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'detail': 'admin required'}, status=status.HTTP_403_FORBIDDEN)
        p = ProtectionSettings.get_solo()
        serializer = ProtectionSettingsSerializer(p)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'detail': 'admin required'}, status=status.HTTP_403_FORBIDDEN)
        p = ProtectionSettings.get_solo()
        
        # Capture old values for audit trail
        old_data = ProtectionSettingsSerializer(p).data
        
        serializer = ProtectionSettingsSerializer(p, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            new_data = ProtectionSettingsSerializer(updated).data
            
            # Calculate changed fields
            changed_fields = {}
            for key in old_data:
                if old_data.get(key) != new_data.get(key):
                    changed_fields[key] = {
                        'old': old_data.get(key),
                        'new': new_data.get(key)
                    }
            
            # Log protection settings change
            ActivityLog.log_action(
                user=request.user,
                action='UPDATE_PROTECTION_SETTINGS',
                resource_type='ProtectionSettings',
                resource_id='system',
                details=json.dumps(changed_fields),
                request=request,
                is_sensitive=True
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MetricsAPIView(generics.GenericAPIView):
    """GET API metrics/counters (admin only)"""
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'detail': 'admin required'}, status=status.HTTP_403_FORBIDDEN)
        
        metrics = {
            'counters': counters.to_dict(),
            'database_stats': {
                'total_declarations': Declaration.objects.count(),
                'total_pending_declarations': PendingDeclaration.objects.count(),
                'pending_processed': PendingDeclaration.objects.filter(processed=True).count(),
                'pending_unprocessed': PendingDeclaration.objects.filter(processed=False).count(),
                'total_activity_logs': ActivityLog.objects.count(),
                'total_admin_sessions': AdminSession.objects.count(),
                'active_admin_sessions': AdminSession.objects.filter(last_seen__gte=timezone.now() - timedelta(hours=1)).count(),
            },
            'timestamp': timezone.now().isoformat(),
        }
        return Response(metrics)
