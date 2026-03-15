# 🎯 LUCID AI - Quick Reference

## 📦 What's New (Production Ready)

### Database Integration
✅ **MongoDB** - Replaced file-based users.json with production-grade database
✅ **Mongoose ORM** - Schemas with validation for Users, Progress, and Courses
✅ **Cloud Ready** - Works with MongoDB Atlas (free tier available)

### Progress Tracking
✅ **Lesson Tracking** - Mark lessons complete, track completion per user
✅ **Quiz System** - Submit quizzes, auto-calculate scores
✅ **Certificates** - Auto-generate certificates at 100% + 80% avg quiz score
✅ **Progress UI** - Beautiful progress bars, stats, and certificates

### AI Integration  
✅ **RunwayML** - Text-to-video generation API integration
✅ **Fallback Videos** - YouTube embeds if API key not configured
✅ **Video Metadata** - Stores generated video info and job IDs in database

### Deployment Ready
✅ **Vercel Config** - Production-optimized serverless configuration
✅ **Environment Security** - All secrets in environment variables
✅ **Documentation** - Complete setup, deployment, and troubleshooting guides

---

## 🚀 Quick Start (3 Minutes)

### Option A: With Local MongoDB
```bash
# 1. Start MongoDB (in separate terminal)
mongod

# 2. Install deps (if not done)
npm install

# 3. Start server
npm start

# 4. Open http://localhost:3000
# Demo user: demo / demo123
```

### Option B: Without MongoDB (Demo Only)
```bash
# Server will start but database features won't work
npm start
```

### Option C: Deploy to Vercel (Production)
See [DEPLOYMENT.md](DEPLOYMENT.md) - 10 minutes to live app

---

## 📂 Important Files

| File | Purpose |
|------|---------|
| `server.js` | Express server + all API routes |
| `models/User.js` | User authentication schema |
| `models/Progress.js` | Progress tracking schema |
| `models/Course.js` | Course metadata schema |
| `api/runway.js` | RunwayML AI integration |
| `scripts/progress.js` | Frontend progress tracking UI |
| `vercel.json` | Vercel deployment config |
| `.env` | Local environment variables |
| `SETUP.md` | Local development guide |
| `DEPLOYMENT.md` | Production deployment guide |
| `CHECKLIST.md` | Pre-deployment checklist |

---

## 🔌 New API Endpoints

### Progress Tracking
```
GET    /api/courses/:courseId/progress
POST   /api/courses/:courseId/complete-lesson
POST   /api/courses/:courseId/submit-quiz
GET    /api/user/progress
```

### AI Video Generation
```
POST   /api/generate-video  (body may include { topic, courseId?, lessonId? } to attach video to a course). Returns jobId/status; poll `/api/video-status/:jobId`.
```

### Health Check
```
GET    /api/health
```

---

## 🗄️ Database Models

### User
- username, password (bcrypt), email
- enrolled: [courseIds]

### Progress
- userId, courseId
- lessonsCompleted: [{lessonId, completedAt}]
- quizzes: [{quizId, score, totalQuestions, completedAt}]
- overallProgress: 0-100%
- certificateEarned: boolean

### Course
- courseId, title, description
- lessons: [{lessonId, title, videoUrl}]
- aiVideoPrompts: [{lessonId, prompt, runwayJobId}]

---

## 🧪 Testing

### Automated Test
```bash
npm run test-enroll
```
Tests: signup → login → enroll → access → unenroll

### Manual Test
```bash
# Health check
curl http://localhost:3000/api/health

# Should return 200 + JSON
```

---

## 📊 Architecture

```
Browser (HTML/CSS/JS)
    ↓
Express Server (Node.js)
    ├─ Routes: /api/*, /courses/*, /dashboard.html
    ├─ Auth: Passport.js + bcryptjs
    ├─ Sessions: express-session
    └─ Database: Mongoose
        ↓
    MongoDB (Users, Progress, Courses)
        ↓
    Optional: RunwayML APIs
```

---

## 🔑 Environment Variables

```env
# Required for MongoDB
MONGODB_URI=mongodb://localhost:27017/lucid-ai
# or (production)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lucid-ai

# Required for sessions
SESSION_SECRET=your-secret-key-random-32-chars

# Optional for AI videos
RUNWAY_API_KEY=your-runway-api-key

# Node environment
NODE_ENV=development  # or production

# Server port
PORT=3000
```

---

## ⚠️ Common Issues

### MongoDB Not Connecting
- [ ] MongoDB is running? (`mongod` command)
- [ ] Connection string correct? (check .env)
- [ ] MongoDB installed? (see SETUP.md)

### Port 3000 Already in Use
```bash
# Kill the process
# macOS/Linux: lsof -ti:3000 | xargs kill -9
# Windows: netstat -ano | findstr :3000
```

### Session Not Working
- Check browser allows cookies
- DevTools → Application → Cookies → see `connect.sid`?

### Videos Not Generating
- RUNWAY_API_KEY set in .env?
- API key valid? (check RunwayML dashboard)
- Will fallback to YouTube videos automatically

---

## 🎓 Learning Path for New Features

1. **Add Quizzes**: Modify course template HTML, use `/api/courses/:id/submit-quiz`
2. **Email Alerts**: Add SendGrid API, update Progress model
3. **Admin Panel**: Create `/admin/*` routes, protect with admin check
4. **Live Classes**: Integrate Zoom or Agora APIs
5. **Certificates**: Generate PDF with PDFKit library

---

## 📖 Documentation

- **LocalDev**: `SETUP.md` - Full instructions
- **Production**: `DEPLOYMENT.md` - MongoDB Atlas, Vercel steps  
- **Checklist**: `CHECKLIST.md` - Pre-deployment verification
- **This File**: `README_QUICK.md` - Quick reference

---

## 💡 Pro Tips

1. **Test Progress Endpoint**
   ```bash
   curl http://localhost:3000/api/courses/dsa-101/progress \
     -H "Cookie: connect.sid=YOUR_SESSION_ID"
   ```

2. **View MongoDB Data Locally**
   ```bash
   mongo
   > use lucid-ai
   > db.users.find()
   ```

3. **Generate Secure Session Secret**
   ```bash
   openssl rand -base64 32
   ```

4. **Check Vercel Logs**
   ```bash
   vercel logs --tail
   ```

---

## ✅ All Features Complete

- [x] Database (MongoDB) integration
- [x] Progress tracking (lessons, quizzes, certificates)
- [x] AI video generation (RunwayML + fallback)
- [x] Deployment configuration (Vercel)
- [x] Complete documentation
- [x] Production-ready security

---

## 🚀 Ready to Deploy?

1. Create MongoDB Atlas account (free)
2. Get connection string
3. Go to https://vercel.com/new
4. Connect GitHub repo
5. Add environment variables
6. Deploy!

**See DEPLOYMENT.md for detailed steps.**

---

**Last Updated**: Feb 22, 2026  
**Version**: 2.0.0 (Production Ready)
