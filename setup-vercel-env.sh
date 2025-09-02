#!/bin/bash

# Setup Vercel Environment Variables for Supabase
# Run this script to automatically configure your Vercel project

echo "🚀 Setting up Vercel environment variables for Supabase..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Set environment variables
echo "📝 Setting REACT_APP_SUPABASE_URL..."
vercel env add REACT_APP_SUPABASE_URL production <<< "https://lhkurlcdrzuncibcehfp.supabase.co"

echo "📝 Setting REACT_APP_SUPABASE_ANON_KEY..."
vercel env add REACT_APP_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3VybGNkcnp1bmNpYmNlaGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MzM5ODksImV4cCI6MjA3MTIwOTk4OX0.MM3MrX3x4zXTAYVSew5gcMSADhm33Ly2f_mhACDSJpE"

echo "✅ Environment variables set successfully!"
echo "🔄 Redeploying your project..."

# Redeploy the project
vercel --prod

echo "🎉 Setup complete! Your app should now be connected to Supabase."
