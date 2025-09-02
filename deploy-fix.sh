#!/bin/bash

echo "🚀 Deploying FPL app fixes to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Go to Vercel Dashboard: https://vercel.com/dashboard"
echo "2. Find your project: pleaase-g92o01qit-rupert-weiners-projects"
echo "3. Go to Settings → Security"
echo "4. DISABLE 'Vercel Authentication' protection"
echo "5. Test the API: https://pleaase-g92o01qit-rupert-weiners-projects.vercel.app/api/health"
echo ""
echo "🎯 Test login with:"
echo "Username: Rupert"
echo "Email: rupertweiner@gmail.com"
