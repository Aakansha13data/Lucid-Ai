require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Import database connection and models
const { connectDB, disconnectDB } = require('./config/database');
const User = require('./models/User');
const Progress = require('./models/Progress');
const Course = require('./models/Course');

// Import API integrations
const { generateAIVideo, checkVideoStatus } = require('./api/runway');
const { generateCompleteLecture, generateLectureScript } = require('./api/lecture-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory lecture storage
const generatedLectures = {};
const lecturesFile = path.join(__dirname, 'data', 'lectures.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Load lectures from file on startup
function loadLectures() {
  if (fs.existsSync(lecturesFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(lecturesFile, 'utf8'));
      Object.assign(generatedLectures, data);
    } catch (e) {
      console.log('No previous lectures found');
    }
  }
}

// Save lectures to file
function saveLectures() {
  fs.writeFileSync(lecturesFile, JSON.stringify(generatedLectures, null, 2));
}

loadLectures();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'lucid-ai-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// Helper to check database connection
const mongoose = require('mongoose');
const dbAvailable = () => mongoose.connection && mongoose.connection.readyState === 1;

// Helper function to get video URL for topic
function getMockVideoForTopic(topic) {
  const topicVideos = {
    'machine learning': { url: 'https://www.youtube.com/embed/sU4u5DTwpT8', title: 'Machine Learning Course' },
    'binary tree': { url: 'https://www.youtube.com/embed/H5JubkIy_p8', title: 'Binary Trees Explained' },
    'linked list': { url: 'https://www.youtube.com/embed/WwfhLC16bis', title: 'Linked Lists for Beginners' },
    'sorting': { url: 'https://www.youtube.com/embed/7KN1XwjlonU', title: 'Sorting Algorithms' },
    'react': { url: 'https://www.youtube.com/embed/bMknfKXIFA8', title: 'React Tutorial for Beginners' },
    'neural': { url: 'https://www.youtube.com/embed/aircAruvnKk', title: 'Neural Networks Explained' },
    'decision': { url: 'https://www.youtube.com/embed/rNJnWTnLbkE', title: 'Decision Trees Learning' },
    'clustering': { url: 'https://www.youtube.com/embed/4b5d3muPQmA', title: 'Clustering Algorithms' },
    'python': { url: 'https://www.youtube.com/embed/rfscVS0vtik', title: 'Python for Beginners' }
  };

  const topicLower = topic.toLowerCase();
  for (const [key, video] of Object.entries(topicVideos)) {
    if (topicLower.includes(key)) {
      return video.url;
    }
  }
  
  return 'https://www.youtube.com/embed/zOjov-2OZ0E';
}

// Passport Local Strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      // if no DB, fallback to JSON file
      if (!dbAvailable()) {
        const usersFile = path.join(__dirname, 'users.json');
        if (fs.existsSync(usersFile)) {
          const raw = fs.readFileSync(usersFile, 'utf8');
          const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
          const entry = data[username];
          if (entry) {
            const bcrypt = require('bcryptjs');
            const valid = await bcrypt.compare(password, entry.password);
            if (valid) return done(null, entry);
          }
        }
        // allow demo user always
        if (username === 'demo' && password === 'demo123') {
          return done(null, { username: 'demo' });
        }
        return done(null, false, { message: 'Invalid username or password' });
      }

      let user = await User.findOne({ username });
      
      // Fallback to demo user if not in DB
      if (!user && username === 'demo') {
        const hashedPassword = await new User({
          username: 'demo',
          password: 'demo123',
          enrolled: []
        }).save();
        const isValid = await hashedPassword.comparePassword('demo123');
        if (isValid) return done(null, { id: hashedPassword._id, username: 'demo' });
      }
      
      if (!user) return done(null, false, { message: 'User not found' });

      const isValid = await user.comparePassword(password);
      if (!isValid) return done(null, false, { message: 'Invalid password' });

      return done(null, { id: user._id, username: user.username });
    } catch (error) {
      done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  // store DB _id or username for file-based user
  if (user && user.id) return done(null, user.id);
  if (user && user.username) return done(null, user.username);
  done(new Error('Cannot serialize user'));
});

passport.deserializeUser(async (id, done) => {
  // if database offline, load from JSON file
  if (!dbAvailable()) {
    const usersFile = path.join(__dirname, 'users.json');
    if (fs.existsSync(usersFile)) {
      const raw = fs.readFileSync(usersFile, 'utf8');
      const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      const entry = data[id] || Object.values(data).find(u => u.username === id);
      if (entry) return done(null, { username: entry.username, enrolled: entry.enrolled || [] });
    }
    return done(null, false);
  }

  try {
    const user = await User.findById(id);
    if (!user) return done(null, false);
    done(null, { id: user._id, username: user.username, enrolled: user.enrolled || [] });
  } catch (error) {
    done(error);
  }
});

// Auth routes
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // if DB unavailable, write to users.json
    if (!dbAvailable()) {
      const usersFile = path.join(__dirname, 'users.json');
      let data = {};
      if (fs.existsSync(usersFile)) {
        const raw = fs.readFileSync(usersFile, 'utf8');
        data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      }
      if (data[username]) {
        return res.status(400).json({ error: 'User already exists' });
      }
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password, 10);
      data[username] = { username, password: hash, enrolled: [] };
      fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
      return res.json({ success: true, user: { username } });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({
      username,
      password,
      enrolled: []
    });
    
    await newUser.save();
    res.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

// Protected route - get user profile
app.get('/api/profile', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  try {
    // Try DB first, fallback to JSON file
    let user = null;
    if (dbAvailable()) {
      user = await User.findById(req.user.id);
    }
    
    if (!user) {
      // Fallback to JSON file for offline mode
      const usersFile = path.join(__dirname, 'users.json');
      if (fs.existsSync(usersFile)) {
        const raw = fs.readFileSync(usersFile, 'utf8');
        const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
        const entry = data[req.user.username] || data[req.user.id];
        if (entry) {
          user = { username: entry.username, enrolled: entry.enrolled || [] };
        }
      }
    }
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: req.user.id, username: user.username || req.user.username, enrolled: user.enrolled || [] } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protect access to course pages for authenticated users only
app.use(async (req, res, next) => {
  if (req.path.startsWith('/courses')) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect('/login.html');
    }
    // If accessing the course template with an id, require enrollment
    if (req.path === '/courses/template-course.html') {
      const courseId = req.query && req.query.id;
      if (courseId && req.user) {
        let enrolled = false;
        try {
          // primary check against database when available
          if (dbAvailable()) {
            const user = await User.findById(req.user.id);
            if (user && Array.isArray(user.enrolled)) {
              enrolled = user.enrolled.includes(courseId);
            }
          }
          // if not found yet, also check local JSON as a fallback/backup
          if (!enrolled) {
            const usersFile = path.join(__dirname, 'users.json');
            if (fs.existsSync(usersFile)) {
              const raw = fs.readFileSync(usersFile, 'utf8');
            const data = JSON.parse(raw.replace(/^\uFEFF/, ''));
              const entry = data[req.user.username] || data[req.user.id];
              if (entry && Array.isArray(entry.enrolled)) {
                enrolled = entry.enrolled.includes(courseId);
              }
            }
          }
        } catch (err) {
          console.error('Error checking enrollment', err);
          enrolled = false;
        }
        console.log('[middleware] checked enrollment for', req.user.username, 'course', courseId, '->', enrolled);
        if (!enrolled) {
          console.log('redirecting user', req.user.username, 'from', courseId);
          return res.redirect('/courses.html');
        }
      }
    }
  }
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Endpoint to fetch course metadata (including AI video prompts) for frontend use
app.get('/api/courses/:courseId', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    let course = null;
    if (dbAvailable()) {
      course = await Course.findOne({ courseId: req.params.courseId });
    }
    if (!course) {
      // fallback to static JSON so the front end can still load
      try {
        const staticCourses = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'courses.json')));
        course = staticCourses.find(c => c.id === req.params.courseId);
      } catch (e) {
        // ignore parse errors
      }
    }
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Explicitly serve CSS with correct content type
app.get('/styles.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'styles.css'));
});

// Generate AI video (updated with RunwayML integration)
app.post('/api/generate-video', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });

  try {
    const { topic, courseId, lessonId } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic required' });

    // delegate to helper (handles API key / mock logic)
    const videoResult = await generateAIVideo(topic);

    // record prompt under course if requested
    if (courseId && lessonId) {
      try {
        let course = await Course.findOne({ courseId });
        if (!course) {
          course = new Course({ courseId, aiVideoPrompts: [] });
        }
        course.aiVideoPrompts.push({
          lessonId,
          prompt: topic,
          generatedAt: new Date(),
          runwayJobId: videoResult.jobId || ''
        });
        await course.save();
      } catch (e) {
        console.warn('Could not record AI prompt to course', e.message);
      }
    }

    res.json(videoResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check the status of a previously requested AI video job
app.get('/api/video-status/:jobId', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const status = await checkVideoStatus(req.params.jobId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate a complete lecture with script, audio (multi-language), and visuals
app.post('/api/generate-lecture', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });
  try {
    const { topic, level = 'intermediate', duration = 5, languages = ['en', 'es', 'fr', 'de'], courseId, lessonId } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic required' });
    
    const jobId = 'lecture_' + Date.now();
    res.json({ status: 'generating', message: 'Lecture generation started', jobId });
    
    generateCompleteLecture(topic, { level, duration, languages, courseId, lessonId })
      .then(lecturePackage => {
        // Check which AI services have real API keys configured
        const hasRealVideoGen = process.env.RUNWAY_API_KEY && process.env.RUNWAY_API_KEY.trim();
        const hasRealAudio = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim();
        const hasRealScript = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim();
        
        // Determine video URL based on API availability
        let videoUrl;
        if (!hasRealVideoGen) {
          // No RunwayML key - use educational YouTube content
          videoUrl = getMockVideoForTopic(topic);
        } else {
          // Have RunwayML key - try to use generated video
          videoUrl = lecturePackage.visuals?.videoUrl || lecturePackage.visuals?.videoEmbed;
          // if generation failed (no URL), fall back to YouTube anyway
          if (!videoUrl) {
            console.warn('Video generation failed or returned empty; falling back to YouTube');
            videoUrl = getMockVideoForTopic(topic);
          }
        }
        
        // determine whether things truly generated or just fell back
        const actuallyAIGeneratedVideo = hasRealVideoGen && videoUrl && !videoUrl.includes('<div') && !videoUrl.includes('youtube');
        const isFullyAIGenerated = actuallyAIGeneratedVideo && hasRealAudio && hasRealScript;
        
        const lecture = {
          id: jobId,
          ...lecturePackage,
          status: 'completed',
          videoUrl: videoUrl,
          isFullyAIGenerated: isFullyAIGenerated,
          apiSetup: {
            videoGeneration: hasRealVideoGen ? 'Real (RunwayML)' : 'Not Configured',
            audioGeneration: hasRealAudio ? 'Real (ElevenLabs)' : 'Not Configured',
            scriptGeneration: hasRealScript ? 'Real (OpenAI)' : 'Not Configured'
          },
          generationErrors: {
            script: lecturePackage.script?.error || null,
            audio: lecturePackage.audio && Object.values(lecturePackage.audio).some(a=>a.isMock && a.note) ? 'audio generation issues' : null,
            visuals: lecturePackage.visuals?.error || null
          }
        };
        generatedLectures[jobId] = lecture;
        saveLectures();
        console.log('Lecture saved:', jobId, 'AI Setup:', JSON.stringify(lecture.apiSetup));
      })
      .catch(error => {
        console.error('Lecture generation error:', error);
        generatedLectures[jobId] = {
          id: jobId,
          topic,
          status: 'failed',
          error: error.message
        };
        saveLectures();
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-generate lectures for a course based on topics
app.post('/api/courses/:courseId/auto-generate-lectures', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });
  try {
    const { courseId } = req.params;
    const { topics = [], languages = ['en', 'es', 'fr', 'de'], level = 'intermediate' } = req.body;
    if (!topics || topics.length === 0) return res.status(400).json({ error: 'Topics list required' });
    
    const jobIds = topics.map((_, idx) => 'lecture_' + (Date.now() + idx));
    
    res.json({
      status: 'generating',
      courseId,
      totalLectures: topics.length,
      jobIds,
      message: `Generating ${topics.length} lectures for the course`
    });
    
    topics.forEach((topic, idx) => {
      const jobId = jobIds[idx];
      generateCompleteLecture(topic, { level, duration: 5, languages, courseId, lessonId: `lesson_${idx + 1}` })
        .then(lecturePackage => {
          let videoUrl = lecturePackage.visuals?.videoUrl || lecturePackage.visuals?.videoEmbed;
          const isAIGenerated = lecturePackage.visuals && !lecturePackage.visuals.isMock;
          
          const lecture = {
            id: jobId,
            ...lecturePackage,
            status: 'completed',
            videoUrl: videoUrl,
            isAIGenerated: isAIGenerated,
            fallbackYoutubeUrl: getMockVideoForTopic(topic)
          };
          generatedLectures[jobId] = lecture;
          saveLectures();
        })
        .catch(err => {
          console.error(`Lecture generation failed for ${topic}:`, err);
          generatedLectures[jobId] = { id: jobId, topic, status: 'failed', error: err.message };
          saveLectures();
        });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get lecture by ID
app.get('/api/lectures/:lectureId', (req, res) => {
  const { lectureId } = req.params;
  const lecture = generatedLectures[lectureId];
  
  if (!lecture) {
    return res.status(404).json({ error: 'Lecture not found' });
  }
  
  if (lecture.status === 'failed') {
    return res.status(400).json({ error: lecture.error || 'Lecture generation failed' });
  }
  
  res.json(lecture);
});

// Get all lectures (authenticated)
app.get('/api/lectures', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Login required' });
  }
  const lectures = Object.values(generatedLectures).sort((a, b) => {
    const aDate = new Date(a.metadata?.createdAt || 0);
    const bDate = new Date(b.metadata?.createdAt || 0);
    return bDate - aDate;
  });
  res.json(lectures);
});

// Enroll in a course
app.post('/api/enroll', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });

  const { courseId } = req.body;
  console.log('📥 /api/enroll called', {
    user: req.user && (req.user.username || req.user.id),
    courseId
  });

  try {
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

    // if db offline, operate on users.json only
    if (!dbAvailable()) {
      // offline mode: update JSON file directly
      const usersFile = path.join(__dirname, 'users.json');
      let data = {};
      if (fs.existsSync(usersFile)) {
        const raw = fs.readFileSync(usersFile, 'utf8');
        data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      }
      const userEntry = data[req.user.username] || data[req.user.id];
      if (!userEntry) return res.status(500).json({ error: 'Local user not found' });
      if (!userEntry.enrolled) userEntry.enrolled = [];
      if (!userEntry.enrolled.includes(courseId)) {
        userEntry.enrolled.push(courseId);
        fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
        console.log('[enroll] offline - added', courseId, 'to', req.user.username);
      } else {
        console.log('[enroll] offline - already enrolled', req.user.username, courseId);
      }
      return res.json({ success: true });
    }

    // Validate course exists
    const course = await Course.findOne({ courseId });
    if (!course) {
      // Fallback to courses.json for legacy courses
      let courses = [];
      try {
        courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'courses.json')));
      } catch (e) { }
      if (!courses.find(c => c.id === courseId)) {
        console.warn('Course not found during enroll check (courseId=', courseId, ')');
        return res.status(404).json({ error: 'Course not found' });
      }
    }

    const user = await User.findById(req.user.id);
    if (!user.enrolled.includes(courseId)) {
      user.enrolled.push(courseId);
      await user.save();
      console.log('[enroll] db - added', courseId, 'to', req.user.username || req.user.id);
    } else {
      console.log('[enroll] db - already enrolled', req.user.username || req.user.id, courseId);
    }

    // Also maintain JSON backup so offline checks remain accurate later
    try {
      const usersFile = path.join(__dirname, 'users.json');
      let data = {};
      if (fs.existsSync(usersFile)) {
        const raw = fs.readFileSync(usersFile, 'utf8');
        data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      }
      const userKey = req.user.username || req.user.id;
      if (!data[userKey]) data[userKey] = { username: userKey, password: '', enrolled: [] };
      if (!data[userKey].enrolled) data[userKey].enrolled = [];
      if (!data[userKey].enrolled.includes(courseId)) {
        data[userKey].enrolled.push(courseId);
        fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
        console.log('[enroll] backup json updated for', userKey);
      }
    } catch (e) {
      console.warn('Could not update backup users.json during enroll', e.message);
    }

    // Create a progress record for this user-course combination
    let progress = await Progress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      progress = new Progress({
        userId: req.user.id,
        courseId,
        lessonsCompleted: [],
        quizzes: [],
        overallProgress: 0
      });
      await progress.save();
    }

    res.json({ success: true, enrolled: user.enrolled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unenroll from a course
app.post('/api/unenroll', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });

  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

    if (!dbAvailable()) {
      const usersFile = path.join(__dirname, 'users.json');
      let data = {};
      if (fs.existsSync(usersFile)) {
        const raw = fs.readFileSync(usersFile, 'utf8');
        data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      }
      const userEntry = data[req.user.username] || data[req.user.id];
      if (userEntry && Array.isArray(userEntry.enrolled)) {
        userEntry.enrolled = userEntry.enrolled.filter(c => c !== courseId);
        fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
        console.log('[unenroll] offline - removed', courseId, 'from', req.user.username);
      }
      return res.json({ success: true, enrolled: userEntry ? userEntry.enrolled : [] });
    }


    const user = await User.findById(req.user.id);
    user.enrolled = user.enrolled.filter(c => c !== courseId);
    await user.save();

    // keep JSON fallback in sync
    try {
      const usersFile = path.join(__dirname, 'users.json');
      let data = {};
      if (fs.existsSync(usersFile)) {
        const raw = fs.readFileSync(usersFile, 'utf8');
        data = JSON.parse(raw.replace(/^\uFEFF/, ''));
      }
      const key = req.user.username || req.user.id;
      if (!data[key]) data[key] = { username: key, password: '', enrolled: [] };
      data[key].enrolled = data[key].enrolled.filter(c => c !== courseId);
      fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
      console.log('[unenroll] backup json updated for', key);
    } catch (e) {
      console.warn('Could not update backup users.json during unenroll', e.message);
    }

    // Optionally, delete progress record
    await Progress.deleteOne({ userId: req.user.id, courseId });

    res.json({ success: true, enrolled: user.enrolled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get progress for a course
app.get('/api/courses/:courseId/progress', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });

  try {
    const { courseId } = req.params;
    const progress = await Progress.findOne({ userId: req.user.id, courseId });

    if (!progress) {
      return res.json({
        overallProgress: 0,
        lessonsCompleted: [],
        certificateEarned: false,
        lastAccessed: null
      });
    }

    res.json({
      overallProgress: progress.overallProgress,
      lessonsCompleted: progress.lessonsCompleted,
      quizzes: progress.quizzes,
      certificateEarned: progress.certificateEarned,
      lastAccessed: progress.lastAccessed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark lesson as complete
app.post('/api/courses/:courseId/complete-lesson', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });

  try {
    const { courseId } = req.params;
    const { lessonId } = req.body;

    if (!lessonId) return res.status(400).json({ error: 'lessonId required' });

    let progress = await Progress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      progress = new Progress({
        userId: req.user.id,
        courseId,
        lessonsCompleted: [{ lessonId, completedAt: new Date() }]
      });
    } else {
      if (!progress.lessonsCompleted.find(l => l.lessonId === lessonId)) {
        progress.lessonsCompleted.push({ lessonId, completedAt: new Date() });
      }
    }

    progress.lastAccessed = new Date();
    progress.updateProgress();
    await progress.save();

    res.json({ success: true, overallProgress: progress.overallProgress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit quiz response
app.post('/api/courses/:courseId/submit-quiz', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });

  try {
    const { courseId } = req.params;
    const { quizId, score, totalQuestions } = req.body;

    if (!quizId || score === undefined || !totalQuestions) {
      return res.status(400).json({ error: 'quizId, score, and totalQuestions required' });
    }

    let progress = await Progress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      progress = new Progress({
        userId: req.user.id,
        courseId,
        quizzes: [{ quizId, score, totalQuestions, completedAt: new Date() }]
      });
    } else {
      if (!progress.quizzes.find(q => q.quizId === quizId)) {
        progress.quizzes.push({ quizId, score, totalQuestions, completedAt: new Date() });
      }
    }

    progress.lastAccessed = new Date();
    progress.updateProgress();
    await progress.save();

    res.json({ success: true, overallProgress: progress.overallProgress, certificateEarned: progress.certificateEarned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all user progress across courses
app.get('/api/user/progress', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Login required' });

  try {
    const progressRecords = await Progress.find({ userId: req.user.id });
    res.json(progressRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/notes.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'notes.html'));
});

app.get('/dashboard.html', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/courses.html', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'courses.html'));
});

app.get('/app-roadmaps.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'app-roadmaps.html'));
});

app.get('/app-roadmap-create.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'app-roadmap-create.html'));
});

app.get('/app.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'app.js'));
});

// Serve assets folder (PDFs and images)
app.get('/assets/:filename', (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, 'assets', filename));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: dbAvailable() ? 'connected' : 'unavailable' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    const db = await connectDB();

    // if database unavailable, patch mongoose models to safe stubs
    if (!db) {
      console.warn('⚠️ Database unavailable – applying offline model fallbacks');
      const patch = async function() { return null; };
      [User, Progress, Course].forEach(model => {
        ['findOne','findById','find','create','save','deleteOne','deleteMany','findOneAndUpdate'].forEach(fn => {
          if (model && model[fn]) {
            model[fn] = patch;
          }
        });
      });
      // disable mongoose command buffering so no timed‑out errors
      const mongoose = require('mongoose');
      mongoose.set('bufferCommands', false);
    }

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      if (db) console.log(`✓ MongoDB connected successfully`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await disconnectDB();
  process.exit(0);
});