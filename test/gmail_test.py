import json
import os
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Load service account credentials
try:
    service_account_info = json.loads(os.environ['GOOGLE_SERVICE_ACCOUNT_KEY'])
except KeyError:
    print("ERROR: GOOGLE_SERVICE_ACCOUNT_KEY environment variable not found")
    print("Please set it first:")
    print("export GOOGLE_SERVICE_ACCOUNT_KEY='<your-service-account-json>'")
    print("")
    print("You can get the value from your Netlify environment variables dashboard")
    exit(1)
credentials = service_account.Credentials.from_service_account_info(
    service_account_info,
    scopes=['https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.modify']
)

# Set up delegation to sales@arxbrokers.com
delegated_credentials = credentials.with_subject('sales@arxbrokers.com')

# Build Gmail service
service = build('gmail', 'v1', credentials=delegated_credentials)

try:
    # Test basic profile access
    profile = service.users().getProfile(userId='me').execute()
    print(f"SUCCESS: Gmail profile access working for {profile['emailAddress']}")
    
    # Test draft creation
    message = {
        'message': {
            'raw': 'VG86IHRlc3RAZXhhbXBsZS5jb20KU3ViamVjdDogVGVzdAoKVGhpcyBpcyBhIHRlc3QgZW1haWwu'  # Base64 encoded test message
        }
    }
    
    draft = service.users().drafts().create(userId='me', body=message).execute()
    print(f"SUCCESS: Gmail draft created with ID {draft['id']}")
    
    # Clean up - delete the test draft
    service.users().drafts().delete(userId='me', id=draft['id']).execute()
    print("SUCCESS: Test draft deleted")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    if hasattr(e, 'resp'):
        print(f"Response status: {e.resp.status}")
        print(f"Response reason: {e.resp.reason}")