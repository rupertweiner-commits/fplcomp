#!/bin/bash

echo "🚀 Setting up Vercel Environment Variables for Supabase"
echo "=================================================="

# Your Supabase credentials
SUPABASE_URL="https://lhkurlcdrzuncibcehfp.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3VybGNkcnp1bmNpYmNlaGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MzM5ODksImV4cCI6MjA3MTIwOTk4OX0.MM3MrX3x4zXTAYVSew5gcMSADhm33Ly2f_mhACDSJpE"

echo "📋 Setting environment variables in Vercel..."
echo ""

# Set the environment variables
vercel env add REACT_APP_SUPABASE_URL production <<< "$SUPABASE_URL"
vercel env add REACT_APP_SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"

echo ""
echo "✅ Environment variables set successfully!"
echo ""
echo "🔄 Redeploying to apply changes..."
vercel --prod

echo ""
echo "🎉 Setup complete! Your app should now work with real Supabase authentication."
echo ""
echo "📝 What was set:"
echo "   REACT_APP_SUPABASE_URL = $SUPABASE_URL"
echo "   REACT_APP_SUPABASE_ANON_KEY = $SUPABASE_ANON_KEY"