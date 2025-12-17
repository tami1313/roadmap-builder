# Deployment Guide

This guide covers how to deploy the Roadmap Builder application to production.

## Prerequisites

- Node.js 18+ installed
- Git repository set up
- Account on a hosting platform (Vercel, Netlify, etc.)

## Environment Variables

Set the following environment variable in your hosting platform:

- `NEXT_PUBLIC_ROADMAP_EDITOR_PASSWORD` - Password for the editor portal (default: `MASPMroadmapeditor`)

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository
   - Configure environment variables:
     - `NEXT_PUBLIC_ROADMAP_EDITOR_PASSWORD` = `MASPMroadmapeditor`
   - Click "Deploy"

3. **Deploy via CLI**:
   ```bash
   vercel
   ```
   Follow the prompts and set environment variables when asked.

### Option 2: Netlify

1. **Install Netlify CLI** (optional):
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy via Netlify Dashboard**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Add environment variable:
     - `NEXT_PUBLIC_ROADMAP_EDITOR_PASSWORD` = `MASPMroadmapeditor`
   - Click "Deploy site"

3. **Deploy via CLI**:
   ```bash
   netlify deploy --prod
   ```

### Option 3: Other Platforms

The application can be deployed to any platform that supports Node.js:

- **Build command**: `npm run build`
- **Start command**: `npm start`
- **Node version**: 18.x or higher

## Post-Deployment

1. **Verify the deployment**:
   - Visit your deployed URL
   - You should see the password prompt
   - Enter `MASPMroadmapeditor` to access the editor

2. **Update password** (if needed):
   - Change `NEXT_PUBLIC_ROADMAP_EDITOR_PASSWORD` in your hosting platform's environment variables
   - Redeploy the application

## Notes

- The application uses client-side storage (localStorage) for roadmap data
- Data is stored in the user's browser, not on the server
- Each user will have their own independent roadmap data
- For shared roadmaps, consider implementing a backend in the future

