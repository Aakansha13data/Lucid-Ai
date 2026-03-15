# LUCID AI - Production Deployment Guide

This guide explains how to deploy the LUCID AI platform to Vercel with a production MongoDB database.

## Prerequisites

- Vercel account (https://vercel.com)
- MongoDB Atlas account (https://www.mongodb.com/cloud/atlas) - FREE tier available
- RunwayML API key (optional for AI video generation) - https://runwayml.com/api
- Git repository

## Step 1: Set Up MongoDB Atlas (Cloud Database)

1. **Create a MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up with your email
   - Create a free tier cluster

2. **Create a Database**
   - In Atlas, create a cluster
   - Select "Free Shared" tier
   - Choose your region (closest to your users)
   - Wait for cluster to deploy (~7-10 minutes)

3. **Create a Database User**
   - Go to "Database Access" in left menu
   - Click "Add New Database User"
   - Create username and password
   - Give it "Atlas Admin" role for now
   - **Save the credentials safely** - you'll need them next

4. **Get Your Connection String**
   - Go to "Clusters" in left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Select "Node.js" as driver
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `myFirstDatabase` with `lucid-ai`
   - This will look like: `mongodb+srv://username:password@cluster.mongodb.net/lucid-ai?retryWrites=true&w=majority`

5. **Whitelist IPs** (for Vercel)
   - In Atlas, go to "Network Access"
   - Click "Add IP Address"
   - Select "Allow access from anywhere" (0.0.0.0/0) - needed for Vercel
   - Remember: This is acceptable since we use auth in our app

## Step 2: Deploy to Vercel

1. **Push Code to GitHub**
   ```bash
   git add .
   git commit -m "Production ready with MongoDB"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Connect your GitHub account
   - Select your repository
   - Click "Import"

3. **Configure Environment Variables**
   - In the "Environment Variables" section, add:
   
   | Variable | Value |
   |----------|-------|
   | `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/lucid-ai?retryWrites=true&w=majority` |
   | `SESSION_SECRET` | Generate a random 32-character string (use: `openssl rand -base64 32`) |
   | `RUNWAY_API_KEY` | Your RunwayML API key (optional, can be added later) |
   | `NODE_ENV` | `production` |

   - Click "Deploy"

4. **Wait for Deployment**
   - Vercel will build and deploy your app
   - You'll get a production URL like `https://lucid-ai-landing.vercel.app`

## Step 3: Verify Deployment

1. **Test the Application**
   ```bash
   # Test health check
   curl https://your-vercel-url.vercel.app/api/health
   
   # Should return: {"status":"ok","database":"connected"}
   ```

2. **Sign Up & Login**
   - Go to https://your-vercel-url.vercel.app
   - Create a test account
   - Verify MongoDB stored your user data

3. **Enroll in a Course**
   - Browse courses
   - Enroll in one
   - Verify it appears in your dashboard

## Step 4: Add AI Video Generation (Optional)

1. **Get RunwayML API Key**
   - Go to https://runwayml.com
   - Sign up and create API key in settings
   - Go to your Vercel project settings
   - Add `RUNWAY_API_KEY` environment variable
   - Redeploy

2. **Test AI Video Generation**
   - After enrolling in a course
   - The `/api/generate-video` endpoint will use RunwayML instead of YouTube fallback

## Step 5: Monitor & Maintain

### Vercel Dashboard
- View logs: https://vercel.com/dashboard → Project → Logs
- Monitor usage
- Manage environment variables
- Set up custom domain

### MongoDB Atlas Dashboard
- View database metrics
- Monitor connection count
- Set up alerts
- Backup data

### Enable Email Notifications
- In Vercel project settings
- Enable email on deployment failures

## Common Issues & Solutions

### Issue: "Error connecting to MongoDB"
**Solution:**
1. Check connection string in vercel.json/environment
2. Verify IP whitelist in MongoDB Atlas (should include 0.0.0.0/0 for Vercel)
3. Ensure password doesn't have special characters or URL-encode them

### Issue: "Cold start too slow"
**Solution:**
1. MongoDB connections are slow on first request (cold start)
2. Normal - Mongoose connection pool will improve after first request
3. Consider upgrading to MongoDB dedicated cluster if needed

### Issue: "Session not persisting"
**Solution:**
1. Vercel serverless functions are stateless
2. We use cookies for sessions - works fine
3. Ensure cookies are set correctly (check browser DevTools)

### Issue: "Videos not generating"
**Solution:**
1. Check if RUNWAY_API_KEY is set
2. Verify API key is valid in RunwayML dashboard
3. Check error logs in Vercel
4. Falls back to mock YouTube videos if API key missing

## Scaling Up

### When to Upgrade
- **MongoDB**: Upgrade to paid tier (M10) when:
  - Approaching storage limits (512MB free tier)
  - Need more connections (500 max on free)
  - Want better performance

- **Vercel**: Auto-scales, but consider:
  - Pro plan for priority support
  - Custom domain in Pro plan
  - Native serverless functions

## Production Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Connection string configured in Vercel
- [ ] SESSION_SECRET set (random 32 chars)
- [ ] App deployed and accessible
- [ ] Health check endpoint working
- [ ] Signup/login working
- [ ] Courses enrolling correctly
- [ ] Progress tracking working
- [ ] PDF downloads working
- [ ] Custom domain set up (optional)
- [ ] SSL/HTTPS enabled (automatic on Vercel)
- [ ] Running automated tests passed

## Useful Commands

```bash
# Test local production build
npm run build
npm run start

# View Vercel deployment logs
vercel logs --tail

# Check deployed app health
curl https://your-app.vercel.app/api/health

# Monitor function executions
vercel logs --follow
```

## Rollback

If something breaks after deployment:
1. Go to Vercel project
2. Click "Deployments" tab
3. Find previous working deployment
4. Click "Rollback"
5. Previous version will be live immediately

## Next Steps

1. Collect analytics on user activity
2. Implement course content management
3. Add video hosting (AWS S3, Cloudinary)
4. Set up automated backups
5. Implement user email notifications
6. Add admin dashboard for course management
