from django.db import models
from django.conf import settings
from django.utils import timezone
import hashlib


class Attachment(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='attachments/%Y/%m/')
    mime_type = models.CharField(max_length=100, blank=True)
    size = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Declaration(models.Model):
    STATUS_CHOICES = [
        ("en_attente", "En attente"),
        ("validee", "Validée"),
        ("rejetee", "Rejetée"),
    ]

    PRIORITY_CHOICES = [
        ("faible", "Faible"),
        ("moyenne", "Moyenne"),
        ("importante", "Importante"),
        ("urgente", "Urgente"),
    ]

    id = models.CharField(max_length=36, primary_key=True)
    tracking_code = models.CharField(max_length=32, unique=True, db_index=True)
    declarant_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)
    type = models.CharField(max_length=50)
    category = models.CharField(max_length=255)
    description = models.TextField()
    incident_date = models.DateTimeField()
    location = models.CharField(max_length=512)
    reward = models.CharField(max_length=255, blank=True, null=True)
    attachments = models.ManyToManyField(Attachment, blank=True, related_name='declarations')
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="en_attente")
    priority = models.CharField(max_length=32, choices=PRIORITY_CHOICES, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_declarations')

    # Technical tracking info
    browser_info = models.CharField(max_length=1024, blank=True, null=True)
    device_type = models.CharField(max_length=255, blank=True, null=True)
    device_model = models.CharField(max_length=255, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)

    def __str__(self):
        return f"Declaration {self.tracking_code} - {self.declarant_name}"
    
    def get_masked_phone(self):
        """Return phone with middle 6 digits masked (for admin display)."""
        if not self.phone or len(self.phone) < 6:
            return self.phone
        return self.phone[:5] + "****" + self.phone[-2:] if len(self.phone) > 12 else self.phone


class ActivityLog(models.Model):
    """Comprehensive activity logging for audit trail and security."""
    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("READ", "Read"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("EXPORT", "Export"),
        ("DOWNLOAD", "Download"),
        ("UPLOAD", "Upload"),
        ("VERIFY", "Verify"),
        ("PROCESS", "Process"),
        ("REJECT", "Reject"),
        ("APPROVE", "Approve"),
        ("BACKUP", "Backup"),
        ("RESTORE", "Restore"),
        ("2FA_ENABLE", "2FA Enable"),
        ("2FA_DISABLE", "2FA Disable"),
        ("PASSWORD_CHANGE", "Password Change"),
        ("PERMISSION_CHANGE", "Permission Change"),
        ("OTHER", "Other"),
    ]
    
    id = models.CharField(max_length=36, primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    username = models.CharField(max_length=255, db_index=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    resource_type = models.CharField(max_length=100, help_text="Type of resource (Declaration, User, AdminSession, etc.)", blank=True)
    resource_id = models.CharField(max_length=255, blank=True, help_text="ID of the resource affected")
    details = models.TextField(blank=True, help_text="JSON details of the change")
    
    # Network/Security info
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Related records
    declaration = models.ForeignKey(Declaration, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    
    # Status
    is_sensitive = models.BooleanField(default=False, help_text="Mark if contains sensitive data")
    
    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"{self.timestamp.isoformat()} - {self.username} - {self.action}"
    
    @classmethod
    def log_action(cls, user, action, resource_type='', resource_id='', details='', request=None, is_sensitive=False):
        """Helper method to log an action."""
        import secrets
        ip = None
        user_agent = ''
        
        if request:
            ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]
        
        return cls.objects.create(
            id=secrets.token_hex(16),
            user=user,
            username=user.username if user else 'anonymous',
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            details=details[:5000] if details else '',  # Limit to 5000 chars
            ip_address=ip,
            user_agent=user_agent,
            is_sensitive=is_sensitive,
        )


class AdminProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    two_factor_enabled = models.BooleanField(default=False)
    # We don't store secrets here for security; two-factor codes are ephemeral


class TwoFactorToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='twofactor_tokens')
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    @classmethod
    def create_for_user(cls, user, code_plain, ttl_seconds=300):
        code_hash = hashlib.sha256(code_plain.encode()).hexdigest()
        return cls.objects.create(
            user=user,
            code_hash=code_hash,
            expires_at=timezone.now() + timezone.timedelta(seconds=ttl_seconds),
        )

    def is_valid(self, code_plain):
        return self.code_hash == hashlib.sha256(code_plain.encode()).hexdigest() and self.expires_at > timezone.now()


class PasswordResetToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reset_tokens')
    token_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    @classmethod
    def create_for_user(cls, user, token_plain, ttl_seconds=3600):
        token_hash = hashlib.sha256(token_plain.encode()).hexdigest()
        return cls.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=timezone.now() + timezone.timedelta(seconds=ttl_seconds)
        )

    def is_valid(self, token_plain):
        return (
            self.token_hash == hashlib.sha256(token_plain.encode()).hexdigest()
            and self.expires_at > timezone.now()
        )


class ProtectionSettings(models.Model):
    """Singleton model storing platform protection toggles configurable from admin UI."""
    enable_rate_limit_declarations = models.BooleanField(default=True)
    rate_limit_declarations = models.CharField(max_length=32, default="5/m")
    enable_captcha_declarations = models.BooleanField(default=True)

    enable_rate_limit_attachments = models.BooleanField(default=True)
    enable_captcha_clues = models.BooleanField(default=False)

    ip_blacklist = models.TextField(blank=True, help_text="One IP per line")
    
    # Data retention (days before auto-deletion)
    pending_declaration_retention_days = models.IntegerField(default=30, help_text="Auto-delete unprocessed pending declarations after N days")
    activity_log_retention_days = models.IntegerField(default=90, help_text="Auto-delete activity logs after N days")
    admin_session_retention_days = models.IntegerField(default=7, help_text="Auto-delete admin sessions after N days")

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Protection Settings"

    @classmethod
    def get_solo(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class PendingDeclaration(models.Model):
    """Persist client-side queued/offline declarations on the server so admins can inspect and process them."""
    id = models.CharField(max_length=36, primary_key=True)
    client_id = models.CharField(max_length=64, blank=True, null=True, help_text="Client-side UUID")
    payload = models.JSONField(help_text="Raw declaration payload as submitted by client")
    tracking_code = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_pending_declarations')
    error = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PendingDeclaration {self.tracking_code or self.id} (processed={self.processed})"
    
    def process(self, user=None):
        """Attempt to convert PendingDeclaration to Declaration. Returns (success, declaration_or_error)."""
        from rest_framework import serializers as drf_serializers
        from .serializers import DeclarationSerializer
        import secrets
        
        if self.processed:
            return (False, "Already processed")
        
        payload = self.payload.copy()
        # Ensure id and tracking_code
        if not payload.get('id'):
            payload['id'] = secrets.token_hex(16)
        if not payload.get('tracking_code'):
            payload['tracking_code'] = secrets.token_urlsafe(12)
        
        # Check if tracking_code already exists
        if Declaration.objects.filter(tracking_code=payload.get('tracking_code')).exists():
            return (False, "Declaration with this tracking_code already exists")
        
        serializer = DeclarationSerializer(data=payload)
        if serializer.is_valid():
            declaration = serializer.save()
            self.processed = True
            self.processed_at = timezone.now()
            self.processed_by = user
            self.save()
            return (True, declaration)
        else:
            error_msg = json.dumps(serializer.errors)
            self.error = error_msg
            self.save()
            return (False, serializer.errors)


class AdminSession(models.Model):
    """Lightweight record of admin sessions for auditing and visibility in the admin UI.
    We deliberately avoid storing JWT tokens; instead we store session_key or a short identifier.
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    session_key = models.CharField(max_length=128, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=1024, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_seen']

    def __str__(self):
        return f"Session {self.user.username if self.user else 'unknown'} @ {self.ip_address or 'unknown'}"


class Clue(models.Model):
    """Modèle pour les indices soumis par le public pour aider à retrouver les objets"""
    id = models.CharField(max_length=36, primary_key=True)
    declaration = models.ForeignKey(Declaration, on_delete=models.CASCADE, related_name='clues')
    phone = models.CharField(max_length=50)
    description = models.TextField()
    image = models.ForeignKey(Attachment, on_delete=models.SET_NULL, null=True, blank=True, related_name='clues')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_clues')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Clue for {self.declaration.tracking_code} by {self.phone}"
