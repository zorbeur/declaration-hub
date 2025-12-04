from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from core.models import Declaration, PendingDeclaration
import json


class SyncAPIViewTestCase(TestCase):
    """Test cases for SyncAPIView batch declaration sync."""

    def setUp(self):
        """Set up test user and client."""
        self.user = User.objects.create_user(username='testadmin', password='testpass123', is_staff=True)
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_sync_valid_declarations(self):
        """Test syncing valid declarations creates them successfully."""
        payload = {
            'declarations': [
                {
                    'declarant_name': 'Jean Dupont',
                    'phone': '+22812345678',
                    'email': 'jean@example.com',
                    'type': 'perte',
                    'category': 'Passeport',
                    'description': 'Mon passeport a été perdu en voyage',
                    'incident_date': '2025-12-04T10:00:00Z',
                    'location': 'Lome',
                }
            ]
        }
        response = self.client.post('/api/sync/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['created_count'], 1)
        self.assertEqual(response.data['pending_count'], 0)
        self.assertEqual(Declaration.objects.count(), 1)

    def test_sync_invalid_declarations_creates_pending(self):
        """Test syncing invalid declarations creates PendingDeclaration for review."""
        payload = {
            'declarations': [
                {
                    'declarant_name': 'Jean',  # Too short, will fail validation
                    'phone': '+228invalid',  # Invalid phone format
                    'email': 'jean@example.com',
                    'type': 'perte',
                    'category': 'Passeport',
                    'description': 'Too short',  # Description too short
                    'incident_date': '2025-12-04T10:00:00Z',
                    'location': 'Lome',
                }
            ]
        }
        response = self.client.post('/api/sync/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['created_count'], 0)
        self.assertEqual(response.data['pending_count'], 1)
        self.assertEqual(PendingDeclaration.objects.count(), 1)
        self.assertEqual(Declaration.objects.count(), 0)

    def test_sync_duplicate_declarations_not_created(self):
        """Test syncing duplicate tracking codes are rejected."""
        # Create first declaration
        Declaration.objects.create(
            id='test-id-1',
            tracking_code='TEST-CODE-1',
            declarant_name='Jean Dupont',
            phone='+22812345678',
            email='jean@example.com',
            type='perte',
            category='Passeport',
            description='Original declaration',
            incident_date='2025-12-04T10:00:00Z',
            location='Lome',
        )

        payload = {
            'declarations': [
                {
                    'tracking_code': 'TEST-CODE-1',  # Already exists
                    'declarant_name': 'Jean Dupont',
                    'phone': '+22812345678',
                    'email': 'jean@example.com',
                    'type': 'perte',
                    'category': 'Passeport',
                    'description': 'Duplicate attempt',
                    'incident_date': '2025-12-04T10:00:00Z',
                    'location': 'Lome',
                }
            ]
        }
        response = self.client.post('/api/sync/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['created_count'], 0)
        self.assertEqual(response.data['errors_count'], 1)
        self.assertEqual(Declaration.objects.count(), 1)

    def test_sync_mixed_batch(self):
        """Test syncing a batch with mix of valid, invalid, and duplicate declarations."""
        # Create an existing declaration
        Declaration.objects.create(
            id='existing-id',
            tracking_code='EXISTING-CODE',
            declarant_name='Existing User',
            phone='+22811111111',
            email='existing@example.com',
            type='perte',
            category='Phone',
            description='Existing declaration here',
            incident_date='2025-12-04T10:00:00Z',
            location='Lome',
        )

        payload = {
            'declarations': [
                # Valid
                {
                    'declarant_name': 'Valid User',
                    'phone': '+22822222222',
                    'email': 'valid@example.com',
                    'type': 'perte',
                    'category': 'Wallet',
                    'description': 'Lost wallet with documents inside',
                    'incident_date': '2025-12-04T10:00:00Z',
                    'location': 'Lome',
                },
                # Invalid (phone format)
                {
                    'declarant_name': 'Invalid User',
                    'phone': 'not-a-phone',
                    'email': 'invalid@example.com',
                    'type': 'perte',
                    'category': 'Keys',
                    'description': 'Lost car keys near office building downtown',
                    'incident_date': '2025-12-04T10:00:00Z',
                    'location': 'Lome',
                },
                # Duplicate
                {
                    'tracking_code': 'EXISTING-CODE',
                    'declarant_name': 'Duplicate Attempt',
                    'phone': '+22833333333',
                    'email': 'duplicate@example.com',
                    'type': 'perte',
                    'category': 'Passport',
                    'description': 'Duplicate tracking code',
                    'incident_date': '2025-12-04T10:00:00Z',
                    'location': 'Lome',
                },
            ]
        }
        response = self.client.post('/api/sync/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['created_count'], 1)  # Only first valid one
        self.assertEqual(response.data['pending_count'], 1)  # Invalid one stored for review
        self.assertEqual(response.data['errors_count'], 1)   # Duplicate error
        self.assertEqual(Declaration.objects.count(), 2)     # Original + new valid
        self.assertEqual(PendingDeclaration.objects.count(), 1)  # Invalid one pending

    def test_sync_requires_authentication(self):
        """Test sync endpoint requires authentication."""
        self.client.credentials()  # Remove credentials
        payload = {'declarations': []}
        response = self.client.post('/api/sync/', payload, format='json')
        self.assertEqual(response.status_code, 401)

    def test_sync_empty_list_rejected(self):
        """Test sync with empty declarations list is rejected."""
        payload = {'declarations': []}
        response = self.client.post('/api/sync/', payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_sync_missing_declarations_key_rejected(self):
        """Test sync missing declarations key is rejected."""
        response = self.client.post('/api/sync/', {}, format='json')
        self.assertEqual(response.status_code, 400)
