# LUCID AI - Complete Setup & Testing Guide

## 🚀 Quick Start

### Option 1: Development (Local MongoDB)

1. **Install MongoDB Locally** (if you don't have it)
   - Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
   - Mac: `brew tap mongodb/brew && brew install mongodb-community`
   - Linux: https://docs.mongodb.com/manual/administration/install-on-linux/

2. **Start MongoDB**
   ```bash
   # macOS/Linux
   mongod
   
   # Windows
   "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
   ```

> 📦 **Offline / JSON fallback:** If MongoDB isn't running or the backend can't be reached, the front‑end will enter an "offline mode". You can still browse courses and click **Enroll**; the app will store your choice in the browser's localStorage and display it as enrolled. When the server comes back up, any locally‑saved enrollments are automatically sent to `/api/enroll` and the local cache is cleared. This keeps the UI working even if you stop the Node process temporarily.

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment**
   - Create `.env` file in root (already created, edit if needed):
   ```env
   MONGODB_URI=mongodb://localhost:27017/lucid-ai
   SESSION_SECRET=your-dev-secret-key
   NODE_ENV=development
   PORT=3000
   ```

5. **Start Server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```
   > ⚠️ **Important:** keep the server running in its own terminal window/tab. Do **not** reuse that prompt for other commands (e.g. `curl`, `node scripts/...`, etc.) because stopping or restarting it will make routes like `/api/enroll` fail. Open a second shell for testing or running client-side scripts.

6. **Access App**
   - Open http://localhost:3000
   - Demo account: username=`demo`, password=`demo123`

### Option 2: Production (MongoDB Atlas Cloud)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## 📊 Database Architecture

### Collections

1. **Users**
   ```json
   {
     "_id": ObjectId,
     "username": "string",
     "password": "bcrypt hash",
     "email": "optional",
     "enrolled": ["courseId1", "courseId2"],
     "createdAt": "Date",
     "updatedAt": "Date"
   }
   ```

2. **Progress**
   ```json
   {
     "_id": ObjectId,
     "userId": ObjectId (ref User),
     "courseId": "string",
     "lessonsCompleted": [
       { "lessonId": "string", "completedAt": "Date" }
     ],
     "quizzes": [
       { "quizId": "string", "score": number, "totalQuestions": number, "completedAt": "Date" }
     ],
     "overallProgress": 0-100,
     "certificateEarned": boolean,
     "lastAccessed": "Date",
     "enrolledAt": "Date"
   }
   ```

3. **Courses** (optional - for AI video generation metadata)
   ```json
   {
     "_id": ObjectId,
     "courseId": "string unique",
     "title": "string",
     "description": "string",
     "lessons": [{ "lessonId", "title", "description", "videoUrl", "duration" }],
     "aiVideoGenerationStatus": "pending|generating|completed|failed",
     "aiVideoPrompts": [{ "lessonId", "prompt", "generatedAt", "runwayJobId" }]
   }
   ```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/signup` - Create new account
- `POST /api/login` - Login (sets session cookie)
- `POST /api/logout` - Logout
- `GET /api/profile` - Get current user info (requires auth)

### Enrollment
- `POST /api/enroll` - Enroll in course
- `POST /api/unenroll` - Unenroll from course
- `GET /api/user/progress` - Get all progress records

### Progress Tracking
- `GET /api/courses/:courseId/progress` - Get progress for specific course
- `POST /api/courses/:courseId/complete-lesson` - Mark lesson complete
- `POST /api/courses/:courseId/submit-quiz` - Submit quiz results

### Video Generation
- `POST /api/generate-video` - Generate AI video (RunwayML) or fallback to YouTube. Accepts JSON `{ topic, courseId?, lessonId? }`. Returns job metadata; use `/api/video-status/:jobId` to query progress.
- `GET /api/health` - Health check

---

## 🧪 Testing

### Automated E2E Test
```bash
npm run test-enroll
```
Tests complete flow: signup → login → enroll → access course → unenroll

### Manual Testing Checklist
- [ ] Signup with new account
- [ ] Login with credentials
- [ ] Browse courses page
- [ ] Enroll in a course
- [ ] View dashboard
- [ ] See progress tracking
- [ ] Download PDF notes
- [ ] Unenroll from course
- [ ] Logout

### Test with cURL
```bash
# Health check
curl http://localhost:3000/api/health

# Signup
curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"testuser","password":"test123"}'

# Get profile (requires auth)
curl http://localhost:3000/api/profile -b cookies.txt

# Enroll in course
curl -X POST http://localhost:3000/api/enroll \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"courseId":"dsa-101"}'

```sh
# check a video job
curl http://localhost:3000/api/video-status/<jobId> -b cookies.txt
```

# Get progress
curl http://localhost:3000/api/courses/dsa-101/progress -b cookies.txt
```

---

## 🗂️ Project Structure

```
lucid-ai-landing/
├── server.js                 # Express server + auth + API routes
├── models/
│   ├── User.js              # Mongoose User schema
│   ├── Progress.js          # Progress tracking schema
│   └── Course.js            # Course metadata schema
├── config/
│   └── database.js          # MongoDB connection
├── api/
│   └── runway.js            # RunwayML AI video integration
├── scripts/
│   ├── progress.js          # Frontend progress tracking module
│   └── test-enroll.js       # E2E test script
├── data/
│   └── courses.json         # Course data (legacy)
├── assests/                 # PDFs and resources
├── HTML pages
│   ├── index.html           # Landing page
│   ├── login.html           # Login/signup
│   ├── courses.html         # Course browsing
│   ├── dashboard.html       # User dashboard
│   └── notes.html           # Notes vault
├── styles.css               # All styling
├── .env                     # Local environment (git-ignored)
├── .env.example             # Environment template
├── vercel.json              # Vercel deployment config
├── package.json             # Dependencies
└── DEPLOYMENT.md            # Production setup guide
```

---

## 🔒 Security Features

- ✅ Password hashing (bcryptjs)
- ✅ Session-based authentication (express-session)
- ✅ Enrollment-based course access
- ✅ HTTPS in production (Vercel)
- ✅ CORS protection
- ✅ Environment variable protection (.env)

---

## 📈 Performance

- **Database**: MongoDB (fast document queries)
- **Session Storage**: File-based (dev) / Vercel serverless (prod)
- **Frontend**: Vanilla JS (no heavy frameworks)
- **CSS**: Optimized with CSS variables
- **Images**: Lazy loading on PDFs
- **Caching**: Static assets cached for 1 year

---

## 🚦 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
# Windows: Look for mongod in Task Manager
# Mac/Linux: `ps aux | grep mongod`

# If not running, start it:
mongod  # Mac/Linux
# or Windows long path shown above
```

### Port Already in Use
```bash
# Kill process on port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Session Not Persisting
- Check browser allows cookies
- In DevTools: Application > Cookies > check for `connect.sid`

### Courses Not Loading
- Verify `data/courses.json` exists
- Check MongoDB has course data
- See server.js logs for SQL errors

### Videos Not Generating
- Check RUNWAY_API_KEY is set
- API key valid? Check RunwayML dashboard
- Console will show fallback to YouTube videos

---

## 📚 Next Steps

1. **Add Real Lessons**: Edit courses in MongoDB
2. **Upload Video Content**: Use AWS S3 or Cloudinary
3. **Email Notifications**: SendGrid or Mailgun integration
4. **Analytics**: Google Analytics or Amplitude
5. **Admin Dashboard**: Manage courses and users
6. **Community Forum**: Discussion boards between users

---

## 📞 Support

- Check DEPLOYMENT.md for production issues
- Review server.js console logs for errors
- Test with provided cURL commands
- Run automated test: `npm run test-enroll`

---

## License

MIT - Feel free to use and modify for your projects!
