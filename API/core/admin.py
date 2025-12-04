from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Q
from .models import Declaration, PasswordResetToken, ActivityLog, AdminProfile, TwoFactorToken, Attachment, Clue, PendingDeclaration, AdminSession


class ProcessedFilter(admin.SimpleListFilter):
    title = 'Traitement'
    parameter_name = 'processed'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Traité'),
            ('no', 'En attente'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(processed=True)
        if self.value() == 'no':
            return queryset.filter(processed=False)
        return queryset


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'mime_type', 'size', 'uploaded_at')
    search_fields = ('name',)


@admin.register(Declaration)
class DeclarationAdmin(admin.ModelAdmin):
    list_display = ('tracking_code', 'declarant_name', 'masked_phone_display', 'status', 'priority', 'created_at')
    search_fields = ('tracking_code', 'declarant_name', 'phone', 'email', 'description')
    list_filter = ('status', 'priority', 'created_at')
    readonly_fields = ('id', 'tracking_code', 'created_at', 'updated_at', 'masked_phone_display')
    
    def masked_phone_display(self, obj):
        """Display masked phone in admin."""
        return obj.get_masked_phone()
    masked_phone_display.short_description = 'Téléphone (masqué)'


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'expires_at', 'created_at')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'username', 'action', 'declaration_link')
    search_fields = ('username', 'action', 'details')
    list_filter = ('action', 'timestamp')
    readonly_fields = ('timestamp', 'id')
    
    def declaration_link(self, obj):
        """Link to related declaration if exists."""
        if obj.declaration:
            url = reverse('admin:core_declaration_change', args=[obj.declaration.id])
            return format_html('<a href="{}">{}</a>', url, obj.declaration.tracking_code)
        return '-'
    declaration_link.short_description = 'Déclaration'


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'two_factor_enabled')


@admin.register(TwoFactorToken)
class TwoFactorTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'expires_at', 'created_at')


@admin.register(Clue)
class ClueAdmin(admin.ModelAdmin):
    list_display = ('id', 'declaration', 'phone', 'is_verified', 'created_at')
    search_fields = ('phone', 'description', 'declaration__tracking_code')
    list_filter = ('is_verified', 'created_at')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(PendingDeclaration)
class PendingDeclarationAdmin(admin.ModelAdmin):
    list_display = ('tracking_code', 'client_id', 'status_badge', 'created_at', 'processed_at')
    search_fields = ('tracking_code', 'client_id', 'payload')
    list_filter = (ProcessedFilter, 'created_at')
    readonly_fields = ('id', 'created_at', 'updated_at', 'processed_at', 'payload_display', 'error_display')
    actions = ['process_pending']
    
    def status_badge(self, obj):
        """Display status as colored badge."""
        if obj.processed:
            return format_html('<span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px;">✓ Traité</span>')
        else:
            return format_html('<span style="background-color: #ffc107; color: black; padding: 3px 10px; border-radius: 3px;">⏳ En attente</span>')
    status_badge.short_description = 'Statut'
    
    def payload_display(self, obj):
        """Display payload as formatted JSON."""
        import json
        return format_html('<pre>{}</pre>', json.dumps(obj.payload, indent=2, ensure_ascii=False))
    payload_display.short_description = 'Payload'
    
    def error_display(self, obj):
        """Display error in red if present."""
        if obj.error:
            return format_html('<pre style="color: red; white-space: pre-wrap;">{}</pre>', obj.error)
        return '-'
    error_display.short_description = 'Erreur'
    
    def process_pending(self, request, queryset):
        """Admin action to process pending declarations."""
        success_count = 0
        error_count = 0
        
        for pending in queryset.filter(processed=False):
            success, result = pending.process(user=request.user)
            if success:
                success_count += 1
            else:
                error_count += 1
        
        self.message_user(request, f'{success_count} déclarations créées, {error_count} erreurs')
    process_pending.short_description = "Traiter les déclarations sélectionnées"


@admin.register(AdminSession)
class AdminSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'last_seen', 'created_at')
    search_fields = ('user__username', 'ip_address')
    list_filter = ('created_at', 'last_seen')
    readonly_fields = ('created_at', 'last_seen')

