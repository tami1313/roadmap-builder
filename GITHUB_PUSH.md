# GitHub Push Instructions

## Authentication Required

GitHub requires authentication to push code. Here are your options:

### Option 1: Use GitHub CLI (Easiest)

If you have GitHub CLI installed:
```bash
gh auth login
```
Follow the prompts to authenticate, then:
```bash
git push -u origin main-v1.5.0
git push --tags
```

### Option 2: Use Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "Roadmap Builder"
   - Select scope: `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Push using the token:**
   ```bash
   # When prompted for username, enter your GitHub username
   # When prompted for password, paste your token (not your GitHub password)
   git push -u origin main-v1.5.0
   git push --tags
   ```

### Option 3: Use SSH (More Secure)

1. **Check if you have SSH keys:**
   ```bash
   ls -la ~/.ssh
   ```

2. **If you don't have SSH keys, generate them:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

3. **Add SSH key to GitHub:**
   - Copy your public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your key and save

4. **Change remote to SSH:**
   ```bash
   git remote set-url origin git@github.com:tami1313/roadmap-builder.git
   git push -u origin main-v1.5.0
   git push --tags
   ```

