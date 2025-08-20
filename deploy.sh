#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 KPG's FPL Competition - Automated Deployment Script"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "client" ]; then
    print_error "This doesn't appear to be the FPL project directory!"
    print_error "Please run this script from the project root directory."
    exit 1
fi

print_status "✅ Project structure verified"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_error "Please create this file with your Supabase credentials first."
    exit 1
fi

print_status "✅ Environment file found"

# Check if Vercel CLI is available (local or global)
VERCEL_CMD=""
if [ -f "node_modules/.bin/vercel" ]; then
    VERCEL_CMD="node_modules/.bin/vercel"
    print_status "Using local Vercel CLI"
elif command -v vercel &> /dev/null; then
    VERCEL_CMD="vercel"
    print_status "Using global Vercel CLI"
else
    print_warning "Vercel CLI not found. Installing locally..."
    npm install vercel
    VERCEL_CMD="node_modules/.bin/vercel"
    print_success "Vercel CLI installed locally"
fi

# Build the frontend
print_status "Building frontend..."
cd client
if npm run build; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed!"
    exit 1
fi
cd ..

# Deploy to Vercel
print_status "Deploying to Vercel..."
if $VERCEL_CMD --prod --yes; then
    print_success "Deployed to Vercel successfully!"
    
    # Get the deployment URL
    DEPLOYMENT_URL=$($VERCEL_CMD ls --json | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ ! -z "$DEPLOYMENT_URL" ]; then
        print_success "Your app is live at: https://$DEPLOYMENT_URL"
    fi
else
    print_error "Vercel deployment failed!"
    exit 1
fi

# Run database migration if needed
print_status "Setting up database..."
if [ -f "migrate.js" ]; then
    print_status "Running database migration..."
    node migrate.js
    if [ $? -eq 0 ]; then
        print_success "Database migration completed"
    else
        print_warning "Database migration had issues - check manually"
    fi
fi

print_success "🎉 Deployment completed!"
echo ""
echo "📱 Your app should now be accessible via the Vercel URL above"
echo "🔧 Next steps:"
echo "   1. Test your app functionality"
echo "   2. Set up custom domain if desired"
echo "   3. Monitor logs in Vercel dashboard"
echo ""
echo "�� Happy deploying!"
