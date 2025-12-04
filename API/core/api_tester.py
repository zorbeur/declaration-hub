"""API Testing and Documentation Views."""
from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class APITestingView(APIView):
    """Serve the API testing HTML page."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return HTML API tester interface."""
        return Response({
            'message': 'Use GET /api-tester/ to access the interactive API tester',
            'endpoints': self._get_endpoints_list(),
        })


def api_tester_view(request):
    """Serve interactive API tester page."""
    endpoints = get_all_api_endpoints()
    return render(request, 'api_tester.html', {
        'endpoints': endpoints,
        'title': 'Declaration Hub API - Tester',
    })


def get_all_api_endpoints():
    """Get all API endpoints with their methods and descriptions."""
    return [
        {
            'method': 'POST',
            'endpoint': '/api/auth/register/',
            'name': 'User Registration',
            'public': True,
            'description': 'Register a new user account',
            'request_body': {
                'username': 'string (required)',
                'email': 'string (required)',
                'password': 'string (required, min 8 chars)',
            },
            'example': {
                'username': 'johndoe',
                'email': 'john@example.com',
                'password': 'SecurePass123!',
            },
            'expected_response': 201,
        },
        {
            'method': 'POST',
            'endpoint': '/api/auth/token/',
            'name': 'Get JWT Token (Login)',
            'public': True,
            'description': 'Obtain JWT access and refresh tokens',
            'request_body': {
                'username': 'string (required)',
                'password': 'string (required)',
            },
            'example': {
                'username': 'johndoe',
                'password': 'SecurePass123!',
            },
            'expected_response': 200,
            'response_data': {
                'access': 'JWT access token',
                'refresh': 'JWT refresh token',
            },
        },
        {
            'method': 'POST',
            'endpoint': '/api/auth/token/refresh/',
            'name': 'Refresh JWT Token',
            'public': True,
            'description': 'Refresh an expired JWT token',
            'request_body': {
                'refresh': 'string (required)',
            },
            'example': {
                'refresh': '<your_refresh_token>',
            },
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/auth/verify-email/',
            'name': 'Verify Email',
            'public': True,
            'description': 'Verify email address with token',
            'request_body': {
                'token': 'string (required)',
            },
            'example': {
                'token': '<verification_token_from_email>',
            },
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/auth/2fa/send/',
            'name': 'Send 2FA Code',
            'public': True,
            'description': 'Send 2FA code to registered email',
            'request_body': {
                'username': 'string (required)',
            },
            'example': {
                'username': 'johndoe',
            },
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/auth/2fa/verify/',
            'name': 'Verify 2FA Code',
            'public': True,
            'description': 'Verify 2FA code and get JWT tokens',
            'request_body': {
                'username': 'string (required)',
                'code': 'string (required, 6 digits)',
            },
            'example': {
                'username': 'johndoe',
                'code': '123456',
            },
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/declarations/',
            'name': 'Create Declaration',
            'public': True,
            'description': 'Submit a new declaration/report',
            'request_body': {
                'declarant_name': 'string (required)',
                'phone': 'string (required)',
                'email': 'string (optional)',
                'type': 'string (required)',
                'category': 'string (required)',
                'description': 'string (required)',
                'incident_date': 'ISO datetime (required)',
                'location': 'string (required)',
                'reward': 'string (optional)',
                'recaptcha': 'string (required if CAPTCHA enabled)',
            },
            'example': {
                'declarant_name': 'John Doe',
                'phone': '+22890123456',
                'email': 'john@example.com',
                'type': 'fraud',
                'category': 'Financial Crime',
                'description': 'Suspected money laundering activity',
                'incident_date': '2025-12-01T14:30:00Z',
                'location': 'Lomé, Togo',
                'reward': '100000 XOF',
                'recaptcha': '<recaptcha_token>',
            },
            'expected_response': 201,
        },
        {
            'method': 'GET',
            'endpoint': '/api/declarations/',
            'name': 'List Declarations',
            'public': True,
            'description': 'Get list of all declarations',
            'params': {
                'page': 'integer (optional, pagination)',
                'limit': 'integer (optional, default 10)',
            },
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/declarations/{id}/',
            'name': 'Get Declaration Detail',
            'public': True,
            'description': 'Get details of a specific declaration',
            'params': {
                'id': 'string (required, declaration ID)',
            },
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/declarations/by-code/?code=<tracking_code>',
            'name': 'Get Declaration by Tracking Code',
            'public': True,
            'description': 'Find declaration by tracking code (for users)',
            'params': {
                'code': 'string (required)',
            },
            'expected_response': 200,
        },
        {
            'method': 'PUT',
            'endpoint': '/api/declarations/{id}/',
            'name': 'Update Declaration',
            'public': False,
            'auth_required': True,
            'description': 'Update declaration (admin only)',
            'request_body': {
                'status': "string (en_attente, validee, rejetee)",
                'priority': "string (faible, moyenne, importante, urgente)",
            },
            'example': {
                'status': 'validee',
                'priority': 'importante',
            },
            'expected_response': 200,
        },
        {
            'method': 'DELETE',
            'endpoint': '/api/declarations/{id}/',
            'name': 'Delete Declaration',
            'public': False,
            'auth_required': True,
            'description': 'Delete declaration (admin only)',
            'expected_response': 204,
        },
        {
            'method': 'POST',
            'endpoint': '/api/attachments/upload/',
            'name': 'Upload Attachment',
            'public': True,
            'description': 'Upload file attachment (max 50MB)',
            'request_body': {
                'file': 'multipart file (required)',
            },
            'expected_response': 201,
        },
        {
            'method': 'POST',
            'endpoint': '/api/clues/',
            'name': 'Submit Clue',
            'public': True,
            'description': 'Submit a clue/tip related to a declaration',
            'request_body': {
                'declaration': 'string (declaration ID)',
                'content': 'string (required)',
                'anonymous': 'boolean (optional, default true)',
            },
            'example': {
                'declaration': '<declaration_id>',
                'content': 'Suspect seen at location X on date Y',
                'anonymous': True,
            },
            'expected_response': 201,
        },
        {
            'method': 'GET',
            'endpoint': '/api/clues/?declaration_id=<id>',
            'name': 'Get Clues for Declaration',
            'public': False,
            'auth_required': True,
            'description': 'Get all clues related to a declaration',
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/activity-logs/',
            'name': 'Get Activity Logs',
            'public': False,
            'auth_required': True,
            'description': 'Get audit trail of all system actions',
            'params': {
                'user': 'string (optional, filter by user)',
                'action': 'string (optional, filter by action)',
                'resource_type': 'string (optional)',
                'page': 'integer (optional)',
            },
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/activity-logs/clear/',
            'name': 'Clear Activity Logs',
            'public': False,
            'auth_required': True,
            'admin_required': True,
            'description': 'Clear all activity logs (admin only)',
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/sync/',
            'name': 'Sync Declarations',
            'public': False,
            'auth_required': True,
            'description': 'Batch sync declarations from client',
            'request_body': {
                'declarations': 'array of declaration objects',
            },
            'example': {
                'declarations': [
                    {
                        'declarant_name': 'Jane Doe',
                        'phone': '+22890654321',
                        'type': 'corruption',
                        'category': 'Government',
                        'description': 'Alleged bribery',
                        'incident_date': '2025-12-01T10:00:00Z',
                        'location': 'Ministry of X',
                    }
                ]
            },
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/pending-declarations/',
            'name': 'Get Pending Declarations',
            'public': False,
            'auth_required': True,
            'description': 'Get list of pending declarations awaiting processing',
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/pending-declarations/{id}/process/',
            'name': 'Process Pending Declaration',
            'public': False,
            'auth_required': True,
            'description': 'Convert pending declaration to official declaration',
            'request_body': {
                'status': "string (validee, rejetee)",
            },
            'example': {
                'status': 'validee',
            },
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/admin-sessions/',
            'name': 'Get Admin Sessions',
            'public': False,
            'auth_required': True,
            'description': 'Get list of active admin sessions',
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/admin-sessions/{id}/heartbeat/',
            'name': 'Session Heartbeat (Keep-alive)',
            'public': False,
            'auth_required': True,
            'description': 'Keep admin session alive',
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/admin/metrics/',
            'name': 'Get API Metrics',
            'public': False,
            'auth_required': True,
            'description': 'Get real-time API metrics and statistics',
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/admin/protection/',
            'name': 'Get Protection Settings',
            'public': False,
            'auth_required': True,
            'admin_required': True,
            'description': 'Get system protection settings',
            'expected_response': 200,
        },
        {
            'method': 'PUT',
            'endpoint': '/api/admin/protection/',
            'name': 'Update Protection Settings',
            'public': False,
            'auth_required': True,
            'admin_required': True,
            'description': 'Update system protection settings (admin only)',
            'request_body': {
                'enable_rate_limit_declarations': 'boolean',
                'rate_limit_declarations': 'string (e.g. "5/m")',
                'enable_captcha_declarations': 'boolean',
                'ip_blacklist': 'string (one IP per line)',
            },
            'example': {
                'enable_rate_limit_declarations': True,
                'rate_limit_declarations': '10/m',
                'enable_captcha_declarations': True,
                'ip_blacklist': '192.168.1.1\n10.0.0.1',
            },
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/admin/backup/',
            'name': 'Get Database Backup',
            'public': False,
            'auth_required': True,
            'admin_required': True,
            'description': 'Export all data as JSON backup',
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/admin/backup/',
            'name': 'Restore Database Backup',
            'public': False,
            'auth_required': True,
            'admin_required': True,
            'description': 'Restore data from JSON backup',
            'request_body': {
                'declarations': 'array',
                'users': 'array',
                'activity_logs': 'array',
            },
            'expected_response': 200,
        },
        {
            'method': 'GET',
            'endpoint': '/api/users/me/',
            'name': 'Get Current User Info',
            'public': False,
            'auth_required': True,
            'description': 'Get information about logged-in user',
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/users/{id}/enable_2fa/',
            'name': 'Enable 2FA',
            'public': False,
            'auth_required': True,
            'description': 'Enable two-factor authentication for user',
            'expected_response': 200,
        },
        {
            'method': 'POST',
            'endpoint': '/api/users/{id}/disable_2fa/',
            'name': 'Disable 2FA',
            'public': False,
            'auth_required': True,
            'description': 'Disable two-factor authentication for user',
            'expected_response': 200,
        },
    ]
