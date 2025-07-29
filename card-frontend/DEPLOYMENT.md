# Deployment Guide

This guide covers deploying the Card Scraper Frontend to various platforms.

## Prerequisites

1. Set up your environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=https://jvkxyjycpomtzfngocge.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

2. Build the application:
   ```bash
   npm run build
   ```

## Vercel Deployment

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   npm run deploy:vercel
   ```

3. **Or use Vercel Dashboard**:
   - Connect your GitHub repository
   - Set environment variables in the Vercel dashboard
   - Deploy automatically on push

## Netlify Deployment

1. **Install Netlify CLI** (optional):
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   npm run deploy:netlify
   ```

3. **Or use Netlify Dashboard**:
   - Connect your GitHub repository
   - Set environment variables in the Netlify dashboard
   - Deploy automatically on push

## GitHub Pages Deployment

1. **Add GitHub Pages dependency**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json**:
   ```json
   {
     "scripts": {
       "deploy:gh": "gh-pages -d dist"
     }
   }
   ```

3. **Deploy**:
   ```bash
   npm run build && npm run deploy:gh
   ```

## WordPress Integration

After deployment, embed the application in WordPress:

```html
<iframe 
  src="https://your-deployed-app.com" 
  width="100%" 
  height="800px" 
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  allow="fullscreen"
></iframe>
```

## Environment Variables

Make sure to set these environment variables in your deployment platform:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Check TailwindCSS configuration
- Verify environment variables are set

### Runtime Errors
- Check browser console for API errors
- Verify Supabase credentials are correct
- Ensure CORS is properly configured on Supabase

### WordPress Issues
- Make sure the iframe URL is accessible
- Check if your WordPress site allows iframe embedding
- Consider using a plugin for better iframe integration