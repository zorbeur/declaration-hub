from django.contrib.auth.models import User
from django.core.validators import EmailValidator, RegexValidator
from rest_framework import serializers
from .models import Declaration, ActivityLog, AdminProfile, Attachment, Clue, ProtectionSettings, PendingDeclaration, AdminSession


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ('id', 'name', 'file', 'mime_type', 'size', 'uploaded_at')
        read_only_fields = ('id', 'size', 'uploaded_at')

    def validate_file(self, value):
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError(f"La taille du fichier dépasse {max_size // 1024 // 1024}MB")
        return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe déjà")
        if len(value) < 3:
            raise serializers.ValidationError("Le nom d'utilisateur doit contenir au moins 3 caractères")
        return value

    def validate_password(self, value):
        if value.isdigit() or value.isalpha():
            raise serializers.ValidationError("Le mot de passe doit contenir des chiffres et des lettres")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = False  # Inactif jusqu'à vérification email
        user.save()
        AdminProfile.objects.get_or_create(user=user)
        return user


class DeclarationSerializer(serializers.ModelSerializer):
    validated_by = UserSerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Declaration
        fields = (
            'id', 'tracking_code', 'declarant_name', 'phone', 'email', 'type', 'category', 'description',
            'incident_date', 'location', 'reward', 'attachments', 'status', 'priority', 'created_at', 'updated_at',
            'validated_by', 'browser_info', 'device_type', 'device_model', 'ip_address'
        )
        read_only_fields = ('id', 'tracking_code', 'created_at', 'updated_at', 'validated_by', 'status')

    def validate_phone(self, value):
        import re
        # Format strict: +228 suivi de 8 chiffres
        if not re.match(r"^\+228\d{8}$", value):
            raise serializers.ValidationError("Le numéro doit être au format +228XXXXXXXX")
        return value

    def validate_email(self, value):
        if value and '@' not in value:
            raise serializers.ValidationError("Email invalide")
        return value

    def validate_description(self, value):
        if len(value) < 10:
            raise serializers.ValidationError("La description doit contenir au moins 10 caractères")
        if len(value) > 5000:
            raise serializers.ValidationError("La description ne doit pas dépasser 5000 caractères")
        return value

    def create(self, validated_data):
        """Ensure `id` and a unique `tracking_code` are generated server-side when missing.
        This covers both the ViewSet and batch-sync endpoints which may call serializer.save().
        """
        import secrets
        from django.db import IntegrityError

        # Generate id if absent
        if not validated_data.get('id'):
            validated_data['id'] = secrets.token_hex(16)

        # Ensure a unique tracking_code
        # Try a few times to avoid rare collisions
        for _ in range(6):
            candidate = secrets.token_urlsafe(9)
            if not Declaration.objects.filter(tracking_code=candidate).exists():
                validated_data['tracking_code'] = candidate
                break
        else:
            # Fallback to a longer token if collisions happen
            validated_data['tracking_code'] = secrets.token_urlsafe(12)

        try:
            return super().create(validated_data)
        except IntegrityError:
            # Rare race: retry once with a longer tracking_code
            validated_data['tracking_code'] = secrets.token_urlsafe(14)
            return super().create(validated_data)


class ActivityLogSerializer(serializers.ModelSerializer):
    declaration = DeclarationSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ('id', 'timestamp', 'user', 'username', 'action', 'details', 'declaration')


class AdminProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AdminProfile
        fields = ('user', 'two_factor_enabled')


class ProtectionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProtectionSettings
        fields = (
            'enable_rate_limit_declarations', 'rate_limit_declarations', 'enable_captcha_declarations',
            'enable_rate_limit_attachments', 'enable_captcha_clues', 'ip_blacklist', 'updated_at'
        )
        read_only_fields = ('updated_at',)


class PendingDeclarationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingDeclaration
        fields = ('id', 'client_id', 'payload', 'tracking_code', 'processed', 'processed_at', 'error', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at', 'processed_at')


class AdminSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AdminSession
        fields = ('id', 'user', 'session_key', 'ip_address', 'user_agent', 'created_at', 'last_seen')
        read_only_fields = ('created_at', 'last_seen')


class ClueSerializer(serializers.ModelSerializer):
    image = AttachmentSerializer(read_only=True)

    class Meta:
        model = Clue
        fields = ('id', 'declaration', 'phone', 'description', 'image', 'created_at', 'is_verified', 'verified_by')
        read_only_fields = ('id', 'created_at', 'is_verified', 'verified_by')
