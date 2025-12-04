from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import PendingDeclaration, ActivityLog, AdminSession, ProtectionSettings


class Command(BaseCommand):
    help = 'Clean up old pending declarations, activity logs, and admin sessions based on retention settings'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted without deleting')

    def handle(self, *args, **options):
        settings = ProtectionSettings.get_solo()
        dry_run = options.get('dry_run', False)
        
        # Delete old unprocessed pending declarations
        pending_cutoff = timezone.now() - timedelta(days=settings.pending_declaration_retention_days)
        pending_count = PendingDeclaration.objects.filter(
            processed=False,
            created_at__lt=pending_cutoff
        ).count()
        
        if not dry_run:
            PendingDeclaration.objects.filter(
                processed=False,
                created_at__lt=pending_cutoff
            ).delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {pending_count} old pending declarations'))
        else:
            self.stdout.write(f'Would delete {pending_count} old pending declarations')
        
        # Delete old activity logs
        log_cutoff = timezone.now() - timedelta(days=settings.activity_log_retention_days)
        log_count = ActivityLog.objects.filter(timestamp__lt=log_cutoff).count()
        
        if not dry_run:
            ActivityLog.objects.filter(timestamp__lt=log_cutoff).delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {log_count} old activity logs'))
        else:
            self.stdout.write(f'Would delete {log_count} old activity logs')
        
        # Delete old admin sessions
        session_cutoff = timezone.now() - timedelta(days=settings.admin_session_retention_days)
        session_count = AdminSession.objects.filter(last_seen__lt=session_cutoff).count()
        
        if not dry_run:
            AdminSession.objects.filter(last_seen__lt=session_cutoff).delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {session_count} old admin sessions'))
        else:
            self.stdout.write(f'Would delete {session_count} old admin sessions')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN: No data was deleted'))
        
        self.stdout.write(self.style.SUCCESS('Cleanup completed'))
