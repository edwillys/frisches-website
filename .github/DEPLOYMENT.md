# Deployment Setup Guide

This guide covers setting up CI/CD with GitHub Actions and deploying to Netlify or Vercel.

## GitHub Actions CI/CD

Three workflows are configured:

1. **CI Pipeline** (`.github/workflows/ci.yml`) - Runs on every push and PR
   - Linting
   - Type checking
   - Unit tests
   - Build verification
   - Coverage reports

2. **Netlify Deploy** (`.github/workflows/deploy-netlify.yml`)
3. **Vercel Deploy** (`.github/workflows/deploy-vercel.yml`)

## Option 1: Deploy to Netlify

### Step 1: Create Netlify Site
1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `frisches-website`
4. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click "Deploy site"

### Step 2: Get Netlify Tokens
1. Go to https://app.netlify.com/user/applications
2. Create a new personal access token
3. Copy the token (you won't see it again)
4. Get your Site ID from Site settings → General → Site information

### Step 3: Add GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `NETLIFY_AUTH_TOKEN` - Your personal access token
- `NETLIFY_SITE_ID` - Your site ID

### Step 4: Enable Workflow
The Netlify deployment workflow will now run automatically on push to main.

## Option 2: Deploy to Vercel

### Step 1: Install Vercel CLI Locally
```bash
npm install -g vercel
```

### Step 2: Link Project
```bash
vercel
```
Follow the prompts to:
- Link to existing project or create new one
- Set up project settings

### Step 3: Get Vercel Tokens
```bash
# Get your Vercel token
vercel token create

# Get organization and project IDs from .vercel/project.json
cat .vercel/project.json
```

### Step 4: Add GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `VERCEL_TOKEN` - Your Vercel token
- `VERCEL_ORG_ID` - From project.json
- `VERCEL_PROJECT_ID` - From project.json

### Step 5: Commit .vercel to .gitignore
The `.vercel` directory is already ignored, but verify:
```bash
echo ".vercel" >> .gitignore
```

## Option 3: Manual Netlify Deploy (Simplest for Testing)

### Quick Deploy Button
1. Go to https://app.netlify.com/start
2. Connect to GitHub repository
3. Auto-detects Vite settings
4. Click "Deploy"

### Deploy from CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
npm run build
netlify deploy --prod --dir=dist
```

## Recommended: Start with Netlify

For testing, Netlify is recommended because:
- ✅ Simpler setup
- ✅ Free tier includes preview deployments
- ✅ Automatic PR previews
- ✅ Great for static sites
- ✅ No credit card required

## Workflow Usage

### For CI Only (No Auto-Deploy)
Keep only `.github/workflows/ci.yml` active and disable the deploy workflows:
- Rename deploy files to `.disabled` extension
- Or delete them entirely

### For Netlify Deploy
1. Set up Netlify secrets as above
2. Push to main branch
3. Check Actions tab for deployment status
4. PR previews will be automatic

### For Vercel Deploy
1. Set up Vercel secrets as above  
2. Push to main branch
3. Check Actions tab for deployment status

## Verifying Deployment

After pushing changes:
1. Go to GitHub repository → Actions tab
2. Click on the latest workflow run
3. Check each job for success/failure
4. If deploy succeeded, check the deployment URL

## Troubleshooting

**Build Fails:**
- Check Node version matches (20.x)
- Ensure `npm ci` vs `npm install` is used
- Verify all dependencies are in package.json

**Netlify Deploy Fails:**
- Verify secrets are set correctly
- Check build command and publish directory
- Review Netlify logs

**Vercel Deploy Fails:**
- Verify all three secrets are set
- Ensure Vercel token has correct permissions
- Check `.vercel/project.json` exists locally

## Next Steps

After successful deployment:
1. Set up custom domain
2. Configure environment variables (if needed)
3. Set up branch previews
4. Add deployment status badges to README
