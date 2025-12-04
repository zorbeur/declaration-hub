from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class APIRootView(APIView):
    """API Root - Lists all available endpoints."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': '✓ Declaration Hub API is running',
            'version': '1.0.0',
            'documentation': {
                'swagger': request.build_absolute_uri('/api/docs/'),
                'redoc': request.build_absolute_uri('/api/redoc/'),
                'schema': request.build_absolute_uri('/api/schema/'),
                'interactive_tester': request.build_absolute_uri('/api/api-tester/'),
            },
            'endpoints': {
                'authentication': [
                    {'method': 'POST', 'path': '/api/auth/register/', 'description': 'Register new user'},
                    {'method': 'POST', 'path': '/api/auth/token/', 'description': 'Get JWT token (login)'},
                    {'method': 'POST', 'path': '/api/auth/token/refresh/', 'description': 'Refresh JWT token'},
                    {'method': 'POST', 'path': '/api/auth/verify-email/', 'description': 'Verify email address'},
                    {'method': 'POST', 'path': '/api/auth/2fa/send/', 'description': 'Send 2FA code'},
                    {'method': 'POST', 'path': '/api/auth/2fa/verify/', 'description': 'Verify 2FA code'},
                ],
                'declarations': [
                    {'method': 'POST', 'path': '/api/declarations/', 'description': 'Create declaration', 'public': True},
                    {'method': 'GET', 'path': '/api/declarations/', 'description': 'List declarations', 'public': True},
                    {'method': 'GET', 'path': '/api/declarations/{id}/', 'description': 'Get declaration detail', 'public': True},
                    {'method': 'GET', 'path': '/api/declarations/by-code/', 'description': 'Find by tracking code', 'public': True},
                    {'method': 'PUT', 'path': '/api/declarations/{id}/', 'description': 'Update declaration', 'auth_required': True},
                    {'method': 'DELETE', 'path': '/api/declarations/{id}/', 'description': 'Delete declaration', 'auth_required': True},
                ],
                'clues': [
                    {'method': 'POST', 'path': '/api/clues/', 'description': 'Submit clue', 'public': True},
                    {'method': 'GET', 'path': '/api/clues/', 'description': 'List clues', 'auth_required': True},
                ],
                'attachments': [
                    {'method': 'POST', 'path': '/api/attachments/upload/', 'description': 'Upload file', 'public': True},
                ],
                'admin': [
                    {'method': 'GET', 'path': '/api/activity-logs/', 'description': 'Get activity logs', 'auth_required': True},
                    {'method': 'GET', 'path': '/api/pending-declarations/', 'description': 'Get pending declarations', 'auth_required': True},
                    {'method': 'GET', 'path': '/api/admin-sessions/', 'description': 'Get admin sessions', 'auth_required': True},
                    {'method': 'GET', 'path': '/api/admin/metrics/', 'description': 'Get API metrics', 'auth_required': True},
                    {'method': 'GET', 'path': '/api/admin/protection/', 'description': 'Get protection settings', 'auth_required': True},
                    {'method': 'GET', 'path': '/api/admin/backup/', 'description': 'Export backup', 'auth_required': True},
                ],
            },
            'quick_start': {
                '1_interactive_tester': '/api/api-tester/ - Test all endpoints with JSON examples',
                '2_api_docs': '/api/docs/ - Swagger UI documentation',
                '3_register': 'POST /api/auth/register/ with username, email, password',
                '4_login': 'POST /api/auth/token/ with username and password to get JWT token',
                '5_use_token': 'Add header: Authorization: Bearer <your_jwt_token>',
                '6_test_api': 'Use the interactive tester at /api/api-tester/',
            },
            'security': {
                'jwt_authentication': 'All protected endpoints require JWT token',
                'cors': 'CORS is configured for authorized domains',
                'rate_limiting': 'API has built-in rate limiting',
                'audit_trail': 'All actions are logged in ActivityLog',
                'https': 'Use HTTPS in production (DEBUG=False)',
            },
            'note': 'Access /api/api-tester/ to test all endpoints with real-time JSON examples!',
        })


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Root and Documentation
    path('api/', APIRootView.as_view(), name='api-root'),
    path('api', APIRootView.as_view(), name='api-root-slash'),
    
    # Core API
    path('api/', include('core.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
