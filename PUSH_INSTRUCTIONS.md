# Git Push Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it: `roadmap-builder` (or any name you prefer)
5. **DO NOT** check "Add a README file" or any other options
6. Click "Create repository"

## Step 2: Copy Your Repository URL

After creating the repository, GitHub will show you a page with setup instructions. Copy the repository URL. It will look like:
- `https://github.com/yourusername/roadmap-builder.git` (HTTPS)
- OR `git@github.com:yourusername/roadmap-builder.git` (SSH)

## Step 3: Run These Commands

Replace `YOUR_REPO_URL` with your actual repository URL:

```bash
# Add the remote repository
git remote add origin YOUR_REPO_URL

# Push your code and tags
git push -u origin main-v1.5.0
git push --tags
```

## Alternative: If you want to push to 'main' branch instead

```bash
# Switch to main branch and merge
git checkout main
git merge main-v1.5.0
git push -u origin main
git push --tags
```

