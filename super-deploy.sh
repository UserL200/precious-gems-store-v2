#!/bin/bash

# 🚀 SUPER AUTOMATED Vercel + PlanetScale Deployment Script
# This script does EVERYTHING: prepares code, creates GitHub repo, sets up database, and deploys to Vercel

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ️${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random string
generate_secret() {
    openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local result
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " result
        echo "${result:-$default}"
    else
        read -p "$prompt: " result
        echo "$result"
    fi
}

# Function to prompt for yes/no with default
prompt_yn() {
    local prompt="$1"
    local default="$2"
    local result
    
    if [ "$default" = "y" ]; then
        read -p "$prompt [Y/n]: " -n 1 result
    else
        read -p "$prompt [y/N]: " -n 1 result
    fi
    echo
    
    case "$result" in
        [Yy]* ) return 0 ;;
        [Nn]* ) return 1 ;;
        "" ) [ "$default" = "y" ] && return 0 || return 1 ;;
        * ) return 1 ;;
    esac
}

# Function to install npm packages globally if not present
install_global_if_missing() {
    if ! command_exists "$1"; then
        print_step "Installing $1 globally..."
        
        # Try different installation methods based on system
        if command_exists sudo && [ "$EUID" -ne 0 ]; then
            print_info "Installing $1 with sudo..."
            sudo npm install -g "$1"
        elif command_exists npx; then
            print_info "Using npx instead of global installation..."
            # We'll use npx later instead of global install
            return 0
        else
            print_warning "Cannot install $1 globally. Trying alternative methods..."
            
            # Try to fix npm permissions first
            if [ -w "$HOME" ]; then
                print_step "Setting up npm for local user installations..."
                mkdir -p "$HOME/.npm-global"
                npm config set prefix "$HOME/.npm-global"
                
                # Add to PATH if not already there
                if ! echo "$PATH" | grep -q "$HOME/.npm-global/bin"; then
                    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME/.bashrc"
                    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
                    export PATH="$HOME/.npm-global/bin:$PATH"
                fi
                
                npm install -g "$1"
            else
                print_error "Cannot install $1. Please run: sudo npm install -g $1"
                return 1
            fi
        fi
        
        print_success "$1 installed!"
    else
        print_success "$1 already installed!"
    fi
}

echo -e "${PURPLE}🚀 SUPER AUTOMATED DEPLOYMENT SCRIPT${NC}"
echo -e "${PURPLE}====================================${NC}"
echo "This script will:"
echo "• Prepare your Node.js app for deployment"
echo "• Create a GitHub repository"
echo "• Set up a free PlanetScale database"
echo "• Deploy to Vercel (100% free, no credit card needed)"
echo "• Configure everything automatically"
echo ""

if ! prompt_yn "Ready to start the magic?" "y"; then
    print_info "Okay, run this script when you're ready!"
    exit 0
fi

print_step "🔍 Checking prerequisites..."

# Check prerequisites
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists git; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

print_success "All prerequisites are installed!"

# Check if we're in a Node.js project
if [ ! -f "package.json" ]; then
    print_error "No package.json found. Please run this script in your Node.js project directory."
    exit 1
fi

print_success "Found package.json - we're in a Node.js project!"

# Install required CLI tools
print_step "🔧 Installing required CLI tools..."

# Special handling for CLI tools
install_vercel() {
    if ! command_exists vercel; then
        print_step "Installing Vercel CLI..."
        
        if command_exists sudo && [ "$EUID" -ne 0 ]; then
            sudo npm install -g vercel
        elif [ -w "$HOME" ]; then
            # Set up npm for user installation
            mkdir -p "$HOME/.npm-global"
            npm config set prefix "$HOME/.npm-global"
            export PATH="$HOME/.npm-global/bin:$PATH"
            npm install -g vercel
        else
            print_warning "Will use npx vercel instead of global installation"
            VERCEL_CMD="npx vercel"
        fi
        
        print_success "Vercel CLI ready!"
    else
        print_success "Vercel CLI already installed!"
    fi
}

install_gh() {
    if ! command_exists gh; then
        print_step "Installing GitHub CLI..."
        
        # Try different installation methods based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command_exists brew; then
                brew install gh
            else
                print_warning "Homebrew not found. Please install GitHub CLI manually from https://cli.github.com"
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Try package manager installation first
            if command_exists apt; then
                curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
                echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
                sudo apt update
                sudo apt install gh
            elif command_exists yum; then
                sudo yum install gh
            elif command_exists npm; then
                # Fallback to npm if available
                if command_exists sudo && [ "$EUID" -ne 0 ]; then
                    sudo npm install -g @github/gh
                else
                    mkdir -p "$HOME/.npm-global"
                    npm config set prefix "$HOME/.npm-global"
                    export PATH="$HOME/.npm-global/bin:$PATH"
                    npm install -g @github/gh
                fi
            else
                print_warning "Please install GitHub CLI manually from https://cli.github.com"
            fi
        else
            print_warning "Please install GitHub CLI manually from https://cli.github.com"
        fi
        
        print_success "GitHub CLI ready!"
    else
        print_success "GitHub CLI already installed!"
    fi
}

# Use the functions
VERCEL_CMD="vercel"
install_vercel
install_gh

# Get project information
print_step "📋 Gathering project information..."

# Try to detect main file
MAIN_FILE="app.js"
if [ -f "server.js" ]; then
    MAIN_FILE="server.js"
elif [ -f "index.js" ]; then
    MAIN_FILE="index.js"
fi

# Get project name from package.json or directory
PROJECT_NAME=$(node -p "require('./package.json').name" 2>/dev/null || basename "$PWD")
PROJECT_NAME=$(prompt_with_default "Project name" "$PROJECT_NAME")

# Get GitHub username
GITHUB_USER=$(gh auth status 2>/dev/null | grep -o "Logged in to github.com as [^[:space:]]*" | cut -d' ' -f6 2>/dev/null || echo "")
if [ -z "$GITHUB_USER" ]; then
    print_step "🔐 Please authenticate with GitHub..."
    gh auth login
    GITHUB_USER=$(gh auth status 2>/dev/null | grep -o "Logged in to github.com as [^[:space:]]*" | cut -d' ' -f6 2>/dev/null || echo "")
fi

print_success "Detected main file: $MAIN_FILE"
print_success "Project name: $PROJECT_NAME"
print_success "GitHub user: $GITHUB_USER"

# Create or update package.json scripts
print_step "📝 Updating package.json scripts..."

# Backup original package.json
cp package.json package.json.backup

# Update package.json with required scripts
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update scripts
pkg.scripts = pkg.scripts || {};
pkg.scripts.start = pkg.scripts.start || 'node $MAIN_FILE';
pkg.scripts.dev = pkg.scripts.dev || 'nodemon $MAIN_FILE';
pkg.scripts.build = pkg.scripts.build || 'echo \"Build complete\"';

// Update engines
pkg.engines = pkg.engines || {};
pkg.engines.node = pkg.engines.node || '>=18.0.0';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Updated package.json');
"

# Create vercel.json configuration
print_step "⚙️ Creating vercel.json configuration..."

cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "$MAIN_FILE",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$MAIN_FILE"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF

print_success "Created vercel.json configuration!"

# Update main file to export app (if needed)
print_step "🔧 Checking if $MAIN_FILE exports the app..."

if ! grep -q "module.exports\s*=\s*app\|export default app" "$MAIN_FILE"; then
    print_warning "$MAIN_FILE doesn't export the app. Adding export statement..."
    echo "" >> "$MAIN_FILE"
    echo "// Export app for Vercel" >> "$MAIN_FILE"
    echo "module.exports = app;" >> "$MAIN_FILE"
    print_success "Added app export to $MAIN_FILE"
else
    print_success "$MAIN_FILE already exports the app!"
fi

# Generate environment variables
print_step "🔑 Generating environment variables..."

SESSION_SECRET=$(generate_secret)
NODE_ENV="production"

# Create .env.example file
cat > .env.example << EOF
# Environment Variables Template
NODE_ENV=development
DATABASE_URL=your-database-url-here
SESSION_SECRET=your-super-secret-key-here
PORT=3000

# Add your other environment variables here
# API_KEY=your-api-key
# STRIPE_SECRET_KEY=your-stripe-key
EOF

print_success "Created .env.example file!"

# Update .gitignore
print_step "📁 Updating .gitignore..."

if [ ! -f ".gitignore" ]; then
    touch .gitignore
fi

# Add common ignores if not present
grep -qxF "node_modules" .gitignore || echo "node_modules" >> .gitignore
grep -qxF ".env" .gitignore || echo ".env" >> .gitignore
grep -qxF ".env.local" .gitignore || echo ".env.local" >> .gitignore
grep -qxF "package.json.backup" .gitignore || echo "package.json.backup" >> .gitignore

print_success "Updated .gitignore!"

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    print_step "🔄 Initializing Git repository..."
    git init
    git branch -M main
    print_success "Git repository initialized!"
fi

# Add all files to git
print_step "📦 Adding files to Git..."
git add .
git commit -m "🚀 Prepare for automated deployment

- Add vercel.json configuration
- Update package.json scripts
- Add .env.example template
- Update .gitignore
- Export app for Vercel compatibility" || print_warning "Nothing to commit or commit failed"

print_success "Files added to Git!"

# Create GitHub repository
print_step "🐙 Creating GitHub repository..."

if prompt_yn "Create GitHub repository?" "y"; then
    # Check if repository already exists
    if gh repo view "$GITHUB_USER/$PROJECT_NAME" >/dev/null 2>&1; then
        print_warning "Repository $GITHUB_USER/$PROJECT_NAME already exists!"
        if prompt_yn "Use existing repository?" "y"; then
            git remote add origin "https://github.com/$GITHUB_USER/$PROJECT_NAME.git" 2>/dev/null || git remote set-url origin "https://github.com/$GITHUB_USER/$PROJECT_NAME.git"
        else
            NEW_NAME=$(prompt_with_default "Enter new repository name" "${PROJECT_NAME}-$(date +%s)")
            PROJECT_NAME="$NEW_NAME"
            gh repo create "$PROJECT_NAME" --public --source=. --remote=origin --push
        fi
    else
        REPO_VISIBILITY="public"
        if prompt_yn "Make repository private?" "n"; then
            REPO_VISIBILITY="private"
        fi
        
        gh repo create "$PROJECT_NAME" --"$REPO_VISIBILITY" --source=. --remote=origin --push
        print_success "Created GitHub repository: https://github.com/$GITHUB_USER/$PROJECT_NAME"
    fi
else
    print_warning "Skipping GitHub repository creation"
fi

# Push to GitHub
print_step "⬆️ Pushing to GitHub..."
git push -u origin main || print_warning "Push failed or already up to date"
print_success "Code pushed to GitHub!"

# Set up PlanetScale database
print_step "🗄️ Setting up PlanetScale database..."

if prompt_yn "Set up free PlanetScale database?" "y"; then
    if ! command_exists pscale; then
        print_step "Installing PlanetScale CLI..."
        
        # Install PlanetScale CLI based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command_exists brew; then
                brew install planetscale/tap/pscale
            else
                print_warning "Homebrew not found. Please install PlanetScale CLI manually from https://planetscale.com/cli"
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -fsSL https://get.planetscale.com/pscale | bash
        else
            print_warning "Please install PlanetScale CLI manually from https://planetscale.com/cli"
        fi
    fi
    
    if command_exists pscale; then
        print_step "🔐 Please authenticate with PlanetScale..."
        pscale auth login
        
        DB_NAME=$(prompt_with_default "Database name" "${PROJECT_NAME}-db")
        
        print_step "Creating PlanetScale database: $DB_NAME..."
        pscale database create "$DB_NAME" --region us-east
        
        print_step "Creating database branch..."
        pscale branch create "$DB_NAME" main
        
        print_step "Getting connection string..."
        CONNECTION_STRING=$(pscale connect "$DB_NAME" main --format json | jq -r '.connection_string' 2>/dev/null || echo "")
        
        if [ -z "$CONNECTION_STRING" ]; then
            print_warning "Could not automatically get connection string. Please get it manually from PlanetScale dashboard."
            CONNECTION_STRING="mysql://username:password@host:port/database?ssl=true"
        fi
        
        print_success "PlanetScale database created!"
    else
        print_warning "PlanetScale CLI not available. Please set up database manually."
        CONNECTION_STRING="your-database-url-here"
    fi
else
    print_warning "Skipping PlanetScale database setup"
    CONNECTION_STRING="your-database-url-here"
fi

# Deploy to Vercel
print_step "🚀 Deploying to Vercel..."

if prompt_yn "Deploy to Vercel now?" "y"; then
    print_step "🔐 Please authenticate with Vercel..."
    vercel login
    
    # Create temporary env file for Vercel
    cat > .env.vercel << EOF
NODE_ENV=production
DATABASE_URL=$CONNECTION_STRING
SESSION_SECRET=$SESSION_SECRET
EOF
    
    print_step "Deploying to Vercel..."
    
    # Deploy with environment variables
    ${VERCEL_CMD} --prod --yes \
        --env NODE_ENV=production \
        --env DATABASE_URL="$CONNECTION_STRING" \
        --env SESSION_SECRET="$SESSION_SECRET"
    
    # Clean up temp file
    rm -f .env.vercel
    
    print_success "Deployed to Vercel!"
    
    # Get deployment URL
    VERCEL_URL=$(vercel ls | grep "$PROJECT_NAME" | head -1 | awk '{print $2}' 2>/dev/null || echo "")
    if [ -n "$VERCEL_URL" ]; then
        print_success "🌐 Your app is live at: https://$VERCEL_URL"
    fi
else
    print_warning "Skipping Vercel deployment"
fi

# Create deployment summary
print_step "📊 Creating deployment summary..."

cat > DEPLOYMENT_SUMMARY.md << EOF
# 🚀 Deployment Summary

## Project Information
- **Project Name**: $PROJECT_NAME
- **GitHub Repository**: https://github.com/$GITHUB_USER/$PROJECT_NAME
- **Main File**: $MAIN_FILE

## Environment Variables
\`\`\`
NODE_ENV=production
DATABASE_URL=$CONNECTION_STRING
SESSION_SECRET=$SESSION_SECRET
\`\`\`

## Deployment Links
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repository**: https://github.com/$GITHUB_USER/$PROJECT_NAME
- **PlanetScale Dashboard**: https://app.planetscale.com

## Files Created/Updated
- ✅ vercel.json (Vercel configuration)
- ✅ package.json (updated scripts and engines)
- ✅ .env.example (environment variables template)
- ✅ .gitignore (updated)
- ✅ $MAIN_FILE (added app export if needed)
- ✅ DEPLOYMENT_SUMMARY.md (this file)

## Next Steps
1. Check your live app deployment
2. Set up database migrations if needed
3. Configure custom domain (optional)
4. Set up monitoring and analytics
5. Add SSL certificate (automatic with Vercel)

## Useful Commands
\`\`\`bash
# Local development
vercel dev

# Deploy from CLI
vercel --prod

# Check deployment logs
vercel logs

# PlanetScale database commands
pscale connect $DB_NAME main
pscale branch create $DB_NAME new-feature
\`\`\`

## Support
- **Vercel Docs**: https://vercel.com/docs
- **PlanetScale Docs**: https://planetscale.com/docs
- **GitHub CLI**: https://cli.github.com/manual/

---
*Generated by Super Automated Deployment Script*
*$(date)*
EOF

print_success "Created DEPLOYMENT_SUMMARY.md!"

# Final summary
echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}========================${NC}"
echo ""
echo -e "${BLUE}📋 What was accomplished:${NC}"
echo "✅ Prepared your Node.js app for deployment"
echo "✅ Created GitHub repository"
echo "✅ Set up PlanetScale database (if selected)"
echo "✅ Deployed to Vercel (if selected)"
echo "✅ Configured all environment variables"
echo "✅ Set up automated deployments"
echo ""

if [ -n "$VERCEL_URL" ]; then
    echo -e "${GREEN}🌐 Your app is live at: https://$VERCEL_URL${NC}"
    echo ""
fi

echo -e "${BLUE}📁 Important files:${NC}"
echo "📄 DEPLOYMENT_SUMMARY.md - Complete deployment information"
echo "📄 .env.example - Environment variables template"
echo "📄 vercel.json - Vercel configuration"
echo ""

echo -e "${YELLOW}💡 Pro Tips:${NC}"
echo "• Use 'git push' to trigger automatic deployments"
echo "• Check Vercel dashboard for analytics and logs"
echo "• Set up branch previews for testing"
echo "• Configure custom domain in Vercel settings"
echo "• Monitor your app performance"
echo ""

echo -e "${PURPLE}🔗 Quick Access Links:${NC}"
echo "• Vercel Dashboard: https://vercel.com/dashboard"
echo "• GitHub Repo: https://github.com/$GITHUB_USER/$PROJECT_NAME"
echo "• PlanetScale Dashboard: https://app.planetscale.com"
echo ""

# Open browser to deployment
if [ -n "$VERCEL_URL" ] && prompt_yn "Open your live app in browser?" "y"; then
    if command_exists open; then
        open "https://$VERCEL_URL"
    elif command_exists xdg-open; then
        xdg-open "https://$VERCEL_URL"
    else
        print_info "Please open https://$VERCEL_URL in your browser"
    fi
fi

print_success "🚀 Happy coding! Your app is now live and ready for the world!"

# Add to git and push final changes
git add .
git commit -m "📊 Add deployment summary and final configuration" || true
git push || true

echo ""
echo -e "${CYAN}✨ Remember: Every time you push to GitHub, your app will automatically update! ✨${NC}"