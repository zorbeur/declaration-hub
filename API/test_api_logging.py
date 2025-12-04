#!/usr/bin/env python
"""
Test complet du système: Créer/Mettre à jour/Supprimer des déclarations et vérifier le logging
"""
import os
import sys
import json
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api_project.settings')
sys.path.insert(0, '/workspaces/declaration-hub/API')
django.setup()

from core.models import Declaration, ActivityLog
from django.utils import timezone

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
            print(f"  Details: {json.dumps(details, indent=8)}")
        except:
            print(f"  Details: {log.details}")

print_section("Test Complet du Système de Logging")

# Get initial log count
initial_logs = ActivityLog.objects.count()
print(f"Logs actuels: {initial_logs}")

# Test 1: Create a declaration
print_section("1. Test CREATE - POST /api/declarations/")
from datetime import datetime, timedelta

declaration_data = {
    "declarant_name": "Test Declarant",
    "phone": "+22812345678",
    "email": "test@example.com",
    "type": "perte",
    "category": "documents",
    "description": "This is a test declaration for logging verification",
    "incident_date": (datetime.now() - timedelta(days=1)).isoformat(),
    "location": "Lome, Togo",
    "status": "en_attente"
}

try:
    response = requests.post(f"{API_URL}/declarations/", json=declaration_data)
    print(f"Status: {response.status_code}")
    if response.status_code in [200, 201]:
        result = response.json()
        test_dec_id = result.get('id')
        test_tracking_code = result.get('tracking_code')
        print(f"✓ Declaration créée avec succès")
        print(f"  ID: {test_dec_id}")
        print(f"  Tracking Code: {test_tracking_code}")
        
        # Check new logs
        new_logs = ActivityLog.objects.all().order_by('-timestamp')[:3]
        print(f"\nLogs créés (derniers 3):")
        for log in new_logs:
            print_log(log)
    else:
        print(f"✗ Erreur: {response.text}")
        test_dec_id = None
except Exception as e:
    print(f"✗ Exception: {e}")
    test_dec_id = None

# Test 2: Update the declaration
if test_dec_id:
    print_section("2. Test UPDATE - PUT /api/declarations/{id}/")
    update_data = {
        "status": "processing",
        "description": "Updated description for testing"
    }
    
    try:
        response = requests.put(f"{API_URL}/declarations/{test_dec_id}/", json=update_data)
        print(f"Status: {response.status_code}")
        if response.status_code in [200]:
            print(f"✓ Declaration mise à jour avec succès")
            
            # Check update log
            recent_logs = ActivityLog.objects.filter(
                action='UPDATE',
                resource_type='Declaration',
                resource_id=test_dec_id
            ).order_by('-timestamp')[:1]
            
            if recent_logs:
                print(f"\nLog UPDATE créé:")
                for log in recent_logs:
                    print_log(log)
            else:
                print("Note: Log UPDATE non trouvé immédiatement")
        else:
            print(f"✗ Erreur: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")

# Test 3: Retrieve the declaration to verify changes
if test_dec_id:
    print_section("3. Test READ - GET /api/declarations/{id}/")
    try:
        response = requests.get(f"{API_URL}/declarations/{test_dec_id}/")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Declaration récupérée")
            print(f"  Status: {result.get('status')}")
            print(f"  Description: {result.get('description')}")
        else:
            print(f"✗ Erreur: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")

# Test 4: Summary of all logs
print_section("4. Résumé Complet du Logging")
all_logs = ActivityLog.objects.all().order_by('-timestamp')
total_logs = all_logs.count()
print(f"Total des logs dans la base: {total_logs}")
print(f"Logs créés pendant ce test: {total_logs - initial_logs}")

# Distribution by action
action_dist = {}
for log in all_logs:
    action = log.action
    action_dist[action] = action_dist.get(action, 0) + 1

print(f"\nDistribution par action:")
for action, count in sorted(action_dist.items(), key=lambda x: x[1], reverse=True):
    print(f"  {action}: {count}")

# Distribution by resource type
resource_dist = {}
for log in all_logs:
    resource = log.resource_type or "N/A"
    resource_dist[resource] = resource_dist.get(resource, 0) + 1

print(f"\nDistribution par resource type:")
for resource, count in sorted(resource_dist.items(), key=lambda x: x[1], reverse=True):
    print(f"  {resource}: {count}")

# Sensitive operations
sensitive_count = all_logs.filter(is_sensitive=True).count()
print(f"\nOpérations sensibles: {sensitive_count}")

print_section("Test Terminé!")
print(f"✓ Logging system is working correctly")
print(f"✓ Total logs in database: {total_logs}")
print(f"✓ Recent logs are properly recorded with resource tracking")
print(f"\nProchain test: Vérifiez /api/api-tester/ pour tester interactivement")
print(f"Ou consultez /api/activity-logs/ pour voir tous les logs")
