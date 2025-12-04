"""Middleware for comprehensive request/response logging and security."""
import json
import logging
from django.http import HttpResponse
from .models import ActivityLog

logger = logging.getLogger(__name__)


class AuditLoggingMiddleware:
    """
    Middleware to log all API requests and responses for audit trail.
    Logs IP, user, endpoint, method, status code, and response time.
    """
    
    # Endpoints to exclude from logging (noisy)
    EXCLUDE_PATHS = [
        '/static/',
        '/media/',
        '/admin/jsi18n/',
        '/api/schema/',
        '/api/docs/',
        '/api/redoc/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def should_log_path(self, path):
        """Check if path should be logged."""
        for exclude in self.EXCLUDE_PATHS:
            if path.startswith(exclude):
                return False
        return True
    
    def __call__(self, request):
        # Only log API requests
        if not self.should_log_path(request.path):
            return self.get_response(request)
        
        # Extract request info
        method = request.method
        path = request.path
        user = getattr(request, 'user', None) if hasattr(request, 'user') else None
        if user and not user.is_authenticated:
            user = None
        ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        # Get response
        response = self.get_response(request)
        
        # Log based on method
        if method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            # Log state-changing operations
            try:
                status = response.status_code
                action = self._map_method_to_action(method)
                resource_type = self._extract_resource_type(path)
                
                if user:
                    ActivityLog.log_action(
                        user=user,
                        action=action,
                        resource_type=resource_type,
                        resource_id=self._extract_resource_id(path),
                        details=json.dumps({
                            'path': path,
                            'method': method,
                            'status': status,
                            'ip': ip,
                        }),
                        request=request,
                        is_sensitive=resource_type in ['Declaration', 'User', 'AdminSession']
                    )
            except Exception as e:
                logger.error(f"Error logging action: {e}")
        
        return response
    
    @staticmethod
    def _map_method_to_action(method):
        """Map HTTP method to ActivityLog action."""
        mapping = {
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'PATCH': 'UPDATE',
            'DELETE': 'DELETE',
            'GET': 'READ',
        }
        return mapping.get(method, 'OTHER')
    
    @staticmethod
    def _extract_resource_type(path):
        """Extract resource type from path."""
        parts = path.strip('/').split('/')
        for part in parts:
            if part in ['declarations', 'users', 'activity-logs', 'clues', 'pending-declarations', 'admin-sessions']:
                # Convert to singular with proper casing
                resource_map = {
                    'declarations': 'Declaration',
                    'users': 'User',
                    'activity-logs': 'ActivityLog',
                    'clues': 'Clue',
                    'pending-declarations': 'PendingDeclaration',
                    'admin-sessions': 'AdminSession',
                }
                return resource_map.get(part, part)
        return 'Unknown'
    
    @staticmethod
    def _extract_resource_id(path):
        """Extract resource ID from path."""
        parts = path.strip('/').split('/')
        if len(parts) >= 3:
            # e.g., /api/declarations/abc123/ -> abc123
            return parts[2]
        return ''


class SecurityHeadersMiddleware:
    """Add security headers to all responses."""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Remove potentially revealing headers
        if 'Server' in response:
            del response['Server']
        
        return response


class RateLimitMiddleware:
    """Simple rate limiting middleware based on IP."""
    
    # Store {ip: [timestamps]} in memory (in production, use Redis)
    _request_times = {}
    MAX_REQUESTS_PER_MINUTE = 100
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        import time
        
        ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR')
        now = time.time()
        
        # Clean old entries (older than 1 minute)
        if ip in self._request_times:
            self._request_times[ip] = [t for t in self._request_times[ip] if now - t < 60]
        else:
            self._request_times[ip] = []
        
        # Check rate limit
        if len(self._request_times[ip]) >= self.MAX_REQUESTS_PER_MINUTE:
            return HttpResponse('Rate limit exceeded', status=429)
        
        # Record this request
        self._request_times[ip].append(now)
        
        response = self.get_response(request)
        return response
