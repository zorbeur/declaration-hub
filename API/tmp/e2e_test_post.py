import requests
import json
from datetime import datetime

API_URL = "http://127.0.0.1:8000/api/declarations/"

# Using Google's reCAPTCHA test keys (server code already uses test secret by default)
RECAPTCHA_TEST_TOKEN = "test-token"

payload = {
    "declarant_name": "Test User",
    "phone": "+22890112233",
    "email": "test@example.com",
    "type": "perte",
    "category": "Téléphone",
    "description": "Déclaration de test E2E — ceci est un message de test.",
    "incident_date": datetime.utcnow().isoformat() + "Z",
    "location": "Dakar, Plateau",
    "reward": "0",
    "browser_info": "TestAgent v1",
    "device_type": "Desktop",
    "device_model": "TestMachine",
    "ip_address": None,
    "recaptcha": RECAPTCHA_TEST_TOKEN
}

headers = {"Content-Type": "application/json"}

print(f"Posting to {API_URL} with payload:\n{json.dumps(payload, indent=2)}\n")

try:
    r = requests.post(API_URL, json=payload, headers=headers, timeout=10)
    print("Status:", r.status_code)
    try:
        print("Response JSON:\n", json.dumps(r.json(), indent=2, ensure_ascii=False))
    except Exception:
        print("Response text:\n", r.text)
except Exception as e:
    print("Request failed:", e)
