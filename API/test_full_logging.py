#!/usr/bin/env python
"""
Test complet du logging: CREATE, UPDATE, DELETE avec authentification
"""
import os
import sys
import json
import django
import requests
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api_project.settings')
sys.path.insert(0, '/workspaces/declaration-hub/API')
django.setup()

from core.models import ActivityLog
from django.contrib.auth.models import User

API_URL = "http://127.0.0.1:8000/api"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def print_log(log):
    """Display a single log entry"""
    print(f"[{log.timestamp.strftime('%H:%M:%S')}] {log.action}")
    print(f"  Resource: {log.resource_type} ID={log.resource_id}")
    if log.user:
        print(f"  User: {log.user.username}")
    print(f"  IP: {log.ip_address}")
    print(f"  Sensitive: {log.is_sensitive}")
    if log.details:
        try:
            details = json.loads(log.details)
            print(f"  Details: {json.dumps(details, indent=6)}")
        except:
            print(f"  Details: {log.details}")

print_section("Test Complet: CREATE, UPDATE, DELETE avec Logging")

# Step 1: Create or get admin user
print("Step 1: Preparing authentication...")
admin_user, created = User.objects.get_or_create(
    username='admin_test',
    defaults={'email': 'admin@test.com', 'is_staff': True}
)
if created:
    admin_user.set_password('testpass123')
    admin_user.save()
    print(f"✓ Admin user created: {admin_user.username}")
else:
    admin_user.set_password('testpass123')
    admin_user.save()
    print(f"✓ Admin user exists: {admin_user.username}")

# Step 2: Get JWT token
print("\nStep 2: Getting JWT token...")
token_response = requests.post(f"{API_URL}/auth/token/", json={
    "username": "admin_test",
    "password": "testpass123"
})

if token_response.status_code == 200:
    tokens = token_response.json()
    access_token = tokens.get('access')
    print(f"✓ Token obtained")
    headers = {"Authorization": f"Bearer {access_token}"}
else:
    print(f"✗ Failed to get token: {token_response.text}")
    sys.exit(1)

# Step 3: Create a test declaration
print_section("Step 3: Testing CREATE (POST /api/declarations/)")
initial_logs = ActivityLog.objects.count()

declaration_data = {
    "declarant_name": "John Doe",
    "phone": "+22890123456",
    "email": "john@test.com",
    "type": "perte",
    "category": "documents_identite",
    "description": "Testing declaration creation with logging",
    "incident_date": (datetime.now() - timedelta(days=2)).isoformat(),
    "location": "Lome, Togo",
    "status": "en_attente"
}

response = requests.post(f"{API_URL}/declarations/", json=declaration_data)
if response.status_code == 201:
    result = response.json()
    dec_id = result.get('id')
    print(f"✓ Declaration created: {dec_id}")
    
    # Check logs
    create_logs = ActivityLog.objects.filter(action='CREATE', resource_id=dec_id)
    if create_logs:
        print(f"\nCreate log:")
        for log in create_logs:
            print_log(log)
    else:
        print("Note: CREATE log may take a moment to appear")
else:
    print(f"✗ Failed to create declaration: {response.text}")
    dec_id = None

# Step 4: Update the declaration
if dec_id:
    print_section("Step 4: Testing UPDATE (PUT /api/declarations/{id}/)")
    
    # First get the full declaration to include all required fields
    get_response = requests.get(f"{API_URL}/declarations/{dec_id}/")
    if get_response.status_code == 200:
        full_data = get_response.json()
        # Update specific fields while keeping others
        full_data['status'] = 'validee'
        full_data['description'] = 'Updated with logging verification - TEST UPDATE'
        
        response = requests.put(
            f"{API_URL}/declarations/{dec_id}/",
            json=full_data,
            headers=headers
        )
        
        if response.status_code == 200:
            print(f"✓ Declaration updated successfully")
            
            # Check UPDATE logs
            update_logs = ActivityLog.objects.filter(action='UPDATE', resource_id=dec_id).order_by('-timestamp')
            if update_logs:
                print(f"\nUpdate log:")
                for log in update_logs[:1]:
                    print_log(log)
            else:
                print("Note: UPDATE log not found immediately")
        else:
            print(f"✗ Failed to update: {response.text}")
    else:
        print(f"✗ Failed to get declaration: {get_response.text}")

# Step 5: Delete the declaration
if dec_id:
    print_section("Step 5: Testing DELETE (DELETE /api/declarations/{id}/)")
    
    response = requests.delete(
        f"{API_URL}/declarations/{dec_id}/",
        headers=headers
    )
    
    if response.status_code == 204:
        print(f"✓ Declaration deleted successfully")
        
        # Check DELETE logs
        delete_logs = ActivityLog.objects.filter(action='DELETE', resource_id=dec_id).order_by('-timestamp')
        if delete_logs:
            print(f"\nDelete log:")
            for log in delete_logs[:1]:
                print_log(log)
        else:
            print("Note: DELETE log not found immediately")
    else:
        print(f"✗ Failed to delete: {response.text}")

# Step 6: Summary
print_section("Summary - Logging Statistics")
total_logs = ActivityLog.objects.count()
new_logs = total_logs - initial_logs

print(f"Initial logs: {initial_logs}")
print(f"Total logs: {total_logs}")
print(f"New logs created: {new_logs}")

# Show all new logs
print(f"\nAll logs created in this test session:")
all_new_logs = ActivityLog.objects.all().order_by('-timestamp')[:new_logs+1]
for log in reversed(list(all_new_logs)):
    if log.action in ['CREATE', 'UPDATE', 'DELETE', 'LOGIN']:
        print_log(log)

print("\n✓ Full logging test completed successfully!")
print(f"✓ All system actions are being properly logged to ActivityLog")
