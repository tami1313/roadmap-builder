# Fix GitHub Authentication

## The Problem
GitHub no longer accepts passwords for Git operations. You MUST use a Personal Access Token.

## Solution: Use Personal Access Token

### Step 1: Create/Get Your Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: "Roadmap Builder"
4. Select scope: Check `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### Step 2: Use Token in Git Push
When Git asks for:
- **Username**: Enter `tami1313`
- **Password**: Paste your **Personal Access Token** (NOT your GitHub password)

The token is a long string like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Try Again
```bash
cd /Users/tamilayman/Cursor/roadmap
git push -u origin main-v1.5.0
```

## Alternative: Use SSH (Easier for Future)

If you want to avoid tokens, we can set up SSH authentication instead. Let me know if you want to do that!

