from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    DeclarationViewSet,
    RegisterAPIView,
    VerifyEmailAPIView,
    ActivityLogViewSet,
    TwoFactorSendAPIView,
    TwoFactorVerifyAPIView,
    BackupAPIView,
    AttachmentUploadAPIView,
    ClueViewSet,
    SyncAPIView,
    ProtectionSettingsAPIView,
    PendingDeclarationViewSet,
    AdminSessionViewSet,
    MetricsAPIView,
)
from .api_tester import api_tester_view, get_all_api_endpoints
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'declarations', DeclarationViewSet, basename='declaration')
router.register(r'activity-logs', ActivityLogViewSet, basename='activitylog')
router.register(r'clues', ClueViewSet, basename='clue')
router.register(r'pending-declarations', PendingDeclarationViewSet, basename='pendingdeclaration')
router.register(r'admin-sessions', AdminSessionViewSet, basename='adminsession')

urlpatterns = [
    # API Testing & Documentation
    path('api-tester/', api_tester_view, name='api_tester'),
    path('api-endpoints/', lambda r: __import__('rest_framework.response', fromlist=['Response']).Response(get_all_api_endpoints()), name='api_endpoints'),
    
    # Authentication
    path('auth/register/', RegisterAPIView.as_view(), name='register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify-email/', VerifyEmailAPIView.as_view(), name='verify_email'),
    path('auth/2fa/send/', TwoFactorSendAPIView.as_view(), name='twofactor_send'),
    path('auth/2fa/verify/', TwoFactorVerifyAPIView.as_view(), name='twofactor_verify'),
    
    # Admin Endpoints
    path('admin/backup/', BackupAPIView.as_view(), name='backup'),
    path('admin/protection/', ProtectionSettingsAPIView.as_view(), name='protection_settings'),
    path('admin/metrics/', MetricsAPIView.as_view(), name='metrics'),
    
    # Public Endpoints
    path('sync/', SyncAPIView.as_view(), name='sync'),
    path('attachments/upload/', AttachmentUploadAPIView.as_view(), name='attachment_upload'),
    path('users/me/', UserViewSet.as_view({'get': 'me'}), name='user_me'),
    
    # Router
    path('', include(router.urls)),
]
