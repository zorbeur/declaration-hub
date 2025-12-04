#!/usr/bin/env python
"""
Script de test complet pour vérifier le logging des opérations
"""
import os
import sys
import json
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api_project.settings')
sys.path.insert(0, '/workspaces/declaration-hub/API')
django.setup()

from core.models import Declaration, ActivityLog
from django.contrib.auth.models import User as DjangoUser
from django.utils import timezone

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def get_recent_logs(limit=5):
    """Get recent activity logs"""
    return ActivityLog.objects.all().order_by('-timestamp')[:limit]

def display_logs(logs):
    """Display activity logs in a readable format"""
    for log in logs:
        print(f"[{log.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {log.action}")
        print(f"  Resource: {log.resource_type} (ID: {log.resource_id})")
        if log.user:
            print(f"  User: {log.user.username}")
        print(f"  IP: {log.ip_address}")
        print(f"  Sensitive: {log.is_sensitive}")
        if log.details:
            try:
                details = json.loads(log.details)
                print(f"  Details: {json.dumps(details, indent=4)}")
            except:
                print(f"  Details: {log.details}")
        print()

# Test 1: Check current log count
print_section("Test 1: Current ActivityLog Count")
initial_count = ActivityLog.objects.count()
print(f"Total logs in database: {initial_count}")

# Test 2: Create a test user
print_section("Test 2: Create Test User (via Django)")
try:
    test_user = DjangoUser.objects.create_user(
        username='testuser_logging',
        email='test@logging.com',
        password='testpass123'
    )
    print(f"✓ User created: {test_user.username}")
except Exception as e:
    print(f"✗ Error: {e}")
    test_user = DjangoUser.objects.get(username='testuser_logging')

# Test 3: Create a declaration
print_section("Test 3: Create Declaration (Simulated)")
print("Note: In production, this would be done via API POST /api/declarations/")
print("For now, check existing declarations...")
decs = Declaration.objects.all()[:3]
if decs:
    print(f"Found {Declaration.objects.count()} declarations in database")
    for d in decs:
        print(f"  - {d.tracking_code} ({d.type})")

# Test 4: Show recent activity logs
print_section("Test 4: Recent Activity Logs (Last 10)")
recent_logs = ActivityLog.objects.all().order_by('-timestamp')[:10]
if recent_logs:
    print(f"Showing {len(recent_logs)} recent logs:\n")
    display_logs(recent_logs)
else:
    print("No activity logs found yet.")

# Test 5: Filter by action type
print_section("Test 5: Filter Logs by Action Type")
action_counts = {}
for log in ActivityLog.objects.all():
    action = log.action
    action_counts[action] = action_counts.get(action, 0) + 1

if action_counts:
    print("Action distribution:")
    for action, count in sorted(action_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {action}: {count}")
else:
    print("No logs with actions found.")

# Test 6: Sensitive operations
print_section("Test 6: Sensitive Operations (is_sensitive=True)")
sensitive_logs = ActivityLog.objects.filter(is_sensitive=True).order_by('-timestamp')[:5]
if sensitive_logs:
    print(f"Found {ActivityLog.objects.filter(is_sensitive=True).count()} sensitive operations")
    print(f"Showing last 5:\n")
    display_logs(sensitive_logs)
else:
    print("No sensitive operations logged yet.")

# Test 7: Summary statistics
print_section("Test 7: Summary Statistics")
total_logs = ActivityLog.objects.count()
sensitive_count = ActivityLog.objects.filter(is_sensitive=True).count()
by_user = ActivityLog.objects.values('user').distinct().count()
by_resource = ActivityLog.objects.values('resource_type').distinct().count()

print(f"Total logs: {total_logs}")
print(f"Sensitive operations: {sensitive_count}")
print(f"Distinct users: {by_user}")
print(f"Resource types: {by_resource}")

if total_logs > 0:
    print(f"\nOldest log: {ActivityLog.objects.order_by('timestamp').first().timestamp}")
    print(f"Newest log: {ActivityLog.objects.order_by('-timestamp').first().timestamp}")

print("\n" + "="*60)
print("Testing complete! Use the API to create/update/delete declarations.")
print("Check /api/activity-logs/ to see logged operations.")
print("="*60 + "\n")
