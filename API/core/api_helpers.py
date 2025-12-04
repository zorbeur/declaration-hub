"""Helper to get endpoints data for API tester."""
import json


def get_api_endpoints_json():
    """Return JSON-serializable list of all API endpoints with examples."""
    from .api_tester import get_all_api_endpoints
    
    endpoints = get_all_api_endpoints()
    
    # Convert to JSON-safe format
    result = []
    for ep in endpoints:
        result.append({
            'method': ep['method'],
            'endpoint': ep['endpoint'],
            'name': ep['name'],
            'public': ep.get('public', False),
            'auth_required': ep.get('auth_required', False),
            'admin_required': ep.get('admin_required', False),
            'description': ep['description'],
            'request_body': ep.get('request_body'),
            'params': ep.get('params'),
            'example': ep.get('example'),
            'expected_response': ep.get('expected_response', 200),
            'response_data': ep.get('response_data'),
        })
    
    return json.dumps(result, default=str)
