# SSH Setup for GitHub - Step by Step

## Step 1: Check if you have SSH keys

Open Terminal and run:
```bash
ls -la ~/.ssh
```

Look for files named `id_rsa` and `id_rsa.pub` or `id_ed25519` and `id_ed25519.pub`

## Step 2: Generate SSH key (if you don't have one)

If you don't see those files, generate a new SSH key:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

**Important:** 
- When it asks "Enter file in which to save the key", just press **Enter** (use default location)
- When it asks for a passphrase, you can press **Enter** for no passphrase, or enter one if you want extra security

## Step 3: Start the SSH agent

```bash
eval "$(ssh-agent -s)"
```

## Step 4: Add your SSH key to the agent

If you used the default name:
```bash
ssh-add ~/.ssh/id_ed25519
```

Or if you have an older key:
```bash
ssh-add ~/.ssh/id_rsa
```

## Step 5: Copy your public key

```bash
cat ~/.ssh/id_ed25519.pub
```

**Copy the entire output** - it will look like:
```
ssh-ed25519 AAAA... your_email@example.com
```

## Step 6: Add the key to GitHub

1. Go to: https://github.com/settings/keys
2. Click "New SSH key"
3. Title: Enter "Mac - Roadmap Builder" (or any name you like)
4. Key: Paste the key you copied in Step 5
5. Click "Add SSH key"

## Step 7: Test the connection

```bash
ssh -T git@github.com
```

You should see: "Hi tami1313! You've successfully authenticated..."

## Step 8: Change Git remote to SSH

```bash
cd /Users/tamilayman/Cursor/roadmap
git remote set-url origin git@github.com:tami1313/roadmap-builder.git
```

## Step 9: Verify the change

```bash
git remote -v
```

You should see `git@github.com` instead of `https://github.com`

## Step 10: Push your code

```bash
git push -u origin main-v1.5.0
git push --tags
```

This time it should work without asking for a password!

