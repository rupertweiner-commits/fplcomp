#!/bin/bash

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Deploy the auth-login function
echo "📦 Deploying auth-login function..."
supabase functions deploy auth-login

echo "✅ Supabase Edge Functions deployed!"
echo ""
echo "🔧 Test the login function:"
echo "curl -X POST https://lhkurlcdrzuncibcehfp.supabase.co/functions/v1/auth-login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\":\"Rupert\",\"password\":\"password123\"}'"
echo ""
echo "🎯 Demo login credentials:"
echo "Username: Rupert | Password: password123"
echo "Username: Portia | Password: password123"
