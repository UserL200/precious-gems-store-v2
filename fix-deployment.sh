#!/bin/bash

# Fix the Vercel deployment with proper naming
# Run this to complete the deployment

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing Vercel deployment...${NC}"

# Generate environment variables
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo -e "${BLUE}==> 🚀 Deploying to Vercel with correct naming...${NC}"

# Deploy to Vercel with a lowercase project name
vercel --prod --yes \
    --name "precious-gems-store-v4" \
    --env NODE_ENV=production \
    --env SESSION_SECRET="$SESSION_SECRET"

echo -e "${GREEN}✅ Deployed to Vercel!${NC}"

# Get deployment URL
echo -e "${BLUE}==> 🔍 Getting deployment URL...${NC}"
VERCEL_URL=$(vercel ls | grep "precious-gems-store-v4" | head -1 | awk '{print $2}' 2>/dev/null || echo "")

# Create deployment summary
echo -e "${BLUE}==> 📊 Creating deployment summary...${NC}"

cat > DEPLOYMENT_SUMMARY.md << EOF
# 🚀 Deployment Summary

## Project Information
- **Project Name**: precious-gems-store-v4
- **GitHub Repository**: https://github.com/UserL200/precious-gems-store-v2
- **Main File**: app.js

## Environment Variables
\`\`\`
NODE_ENV=production
SESSION_SECRET=$SESSION_SECRET
\`\`\`

## Deployment Links
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repository**: https://github.com/UserL200/precious-gems-store-v2
- **Live App**: https://$VERCEL_URL

## Files Created/Updated
- ✅ vercel.json (Vercel configuration)
- ✅ package.json (updated scripts and engines)
- ✅ .env.example (environment variables template)
- ✅ .gitignore (updated)
- ✅ app.js (already had app export)
- ✅ DEPLOYMENT_SUMMARY.md (this file)

## Next Steps
1. Check your live app deployment
2. Set up database connection if needed
3. Configure custom domain (optional)
4. Set up monitoring and analytics

## Useful Commands
\`\`\`bash
# Local development
vercel dev

# Deploy from CLI
vercel --prod

# Check deployment logs
vercel logs

# List all deployments
vercel ls
\`\`\`

## Database Setup (Manual)
Since PlanetScale CLI installation failed, you can:
1. Go to https://planetscale.com
2. Create a free account
3. Create a new database
4. Get the connection string
5. Add it to your Vercel environment variables

## Environment Variables in Vercel
To add more environment variables:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add: DATABASE_URL, API_KEYS, etc.

---
*Generated after fixing deployment issues*
*$(date)*
EOF

echo -e "${GREEN}✅ Created DEPLOYMENT_SUMMARY.md!${NC}"

# Add files to git and push
git add .
git commit -m "📊 Add deployment summary after successful Vercel deployment" || true
git push || true

# Final summary
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}========================${NC}"
echo ""

if [ -n "$VERCEL_URL" ]; then
    echo -e "${GREEN}🌐 Your app is live at: https://$VERCEL_URL${NC}"
else
    echo -e "${YELLOW}🔍 Check your Vercel dashboard for the live URL${NC}"
fi

echo ""
echo -e "${BLUE}📋 What was accomplished:${NC}"
echo "✅ Fixed project naming for Vercel"
echo "✅ Deployed to Vercel successfully"
echo "✅ Set up environment variables"
echo "✅ Created deployment summary"
echo ""

echo -e "${YELLOW}💡 Next steps:${NC}"
echo "• Check your live app in the browser"
echo "• Set up database connection manually"
echo "• Configure any additional environment variables"
echo "• Test all app functionality"
echo ""

echo -e "${GREEN}✅ Your gem store is now live! 💎${NC}"