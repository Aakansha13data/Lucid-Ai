# AI Lecture Generation System

## Overview

LUCID AI can **automatically generate complete educational lectures** with:

- ✅ Engaging, well-structured scripts (using GPT-4)
- ✅ High-quality voice narration in 4+ languages (using ElevenLabs)
- ✅ Professional visuals & animations (using RunwayML)
- ✅ Automatic course integration & management
- ✅ Multi-language subtitle support

## Features

### 1. **Autonomous Lecture Generation**
- Enter a topic → System generates a complete 5-15 minute lecture
- Uses GPT-4 to create pedagogically sound scripts
- Automatically structures with objectives, sections, key takeaways
- Each lecture includes learning outcomes and application examples

### 2. **Multilingual Audio**
Supported languages (powered by ElevenLabs):
- 🇺🇸 English (US/UK accents available)
- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇮🇹 Italian
- 🇯🇵 Japanese
- 🇨🇳 Mandarin Chinese
- 🇰🇷 Korean
- *...and 20+ more*

### 3. **Professional Visuals**
- AI-generated diagrams and infographics
- Animated transitions and annotations
- Text overlays with lecture points
- Optional AI avatar presenter (with Synthesia)

### 4. **Auto-Generation for Entire Courses**
Generate a complete course curriculum in one request:
```bash
POST /api/courses/{courseId}/auto-generate-lectures
Body: { 
  topics: ["Binary Trees", "Sorting Algorithms", "Dynamic Programming"],
  languages: ["en", "es", "fr"],
  level: "intermediate"
}
```

## Setup (Real Implementation)

### 1. Get API Keys

#### OpenAI (GPT-4 for scripts)
```bash
# Visit: https://platform.openai.com/account/api-keys
# Create API key, set in .env:
OPENAI_API_KEY=sk-...your-key...
```

#### ElevenLabs (Voice generation)
```bash
# Visit: https://elevenlabs.io
# Sign up, create API key, set in .env:
ELEVENLABS_API_KEY=sk_...your-key...
```

#### RunwayML (Video visuals)
```bash
# Visit: https://runwayml.com
# Create account, generate API key, set in .env:
RUNWAY_API_KEY=your-key...
```

### 2. Environment Configuration
Update `.env`:
```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
RUNWAY_API_KEY=...
```

### 3. Start the Server
```bash
node server.js
```

## API Endpoints

### Generate a Single Lecture
```bash
POST /api/generate-lecture
Content-Type: application/json
Authorization: Bearer <session>

{
  "topic": "Quantum Computing Basics",
  "level": "intermediate",
  "duration": 10,
  "languages": ["en", "es", "fr", "de"],
  "courseId": "optional",
  "lessonId": "optional"
}
```

**Response:**
```json
{
  "status": "generating",
  "message": "Lecture generation started",
  "jobId": "lecture_1234567"
}
```

Then the lecture is generated in the background with:
- Complete script structure (objectives, sections, summary)
- Multi-language audio files
- Professional video visuals
- Ready for playback/sharing

### Auto-Generate for Entire Course
```bash
POST /api/courses/dsa-101/auto-generate-lectures
Content-Type: application/json

{
  "topics": [
    "Arrays and Lists",
    "Stacks and Queues",
    "Binary Trees",
    "Sorting Algorithms",
    "Dynamic Programming"
  ],
  "level": "intermediate",
  "languages": ["en", "es", "fr"]
}
```

Generates 5 complete lectures automatically, one per topic.

## Example Lecture Output

When generation completes, each lecture contains:

### Script
```json
{
  "title": "Introduction to Binary Trees",
  "objectives": [
    "Understand tree structure and terminology",
    "Learn insertion/deletion operations",
    "Apply trees to real-world problems"
  ],
  "sections": [
    {
      "title": "What is a Tree?",
      "content": "A tree is a hierarchical data structure...",
      "visuals": "Animated tree diagram with nodes"
    },
    ...
  ],
  "estimatedDuration": 600
}
```

### Audio
```json
{
  "en": {
    "fileName": "lecture_Binary_Trees_en.mp3",
    "voiceName": "Bella (US)",
    "duration": 600,
    "language": "en"
  },
  "es": {
    "fileName": "lecture_Binary_Trees_es.mp3",
    "voiceName": "Diego (ES)",
    "duration": 600,
    "language": "es"
  },
  ...
}
```

### Video
```json
{
  "videoUrl": "https://...",
  "title": "Introduction to Binary Trees",
  "visuals": "Professional animated diagrams",
  "duration": 600
}
```

## Web Interface

### AI Lectures Page (`/lectures.html`)

1. **Generate New Lecture**
   - Topic input
   - Difficulty level selector (Beginner/Intermediate/Advanced)
   - Duration chooser (3/5/10/15 minutes)
   - Multi-language checkboxes
   - "Generate" button

2. **Lecture Library**
   - View all generated lectures
   - Play/Download/Share options
   - Language selection for playback
   - Usage statistics

3. **Course Integration**
   - Assign lectures to courses
   - Track completion
   - Student access control

## Advanced Features

### Automatic Scheduling
Generate lectures on a schedule using `node-cron`:

```javascript
const cron = require('node-cron');

// Generate featured lecture every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  await generateCompleteLecture('Topic of the Day', {
    level: 'intermediate',
    languages: ['en', 'es', 'fr']
  });
});
```

### Custom Voice Cloning
```javascript
// Clone your own voice with ElevenLabs
const voiceClone = await elevenlabs.cloneVoice({
  name: 'My Voice',
  audioFiles: ['sample1.wav', 'sample2.wav']
});
```

### Lecture Analytics
Track:
- Views per language
- Completion rates
- Student engagement
- Popular topics
- Performance by level

## Limitations & Notes

1. **Generation Time**: Full lectures take 2-5 minutes
2. **API Costs**: 
   - OpenAI: ~$0.10 per lecture script
   - ElevenLabs: ~$0.15 per language audio
   - RunwayML: Variable (free tier available)
3. **Quality**: Better results with detailed topic descriptions
4. **Offline Mode**: Limited to mock generation without API keys

## Example: Creating a Data Structures Course

```javascript
// 1. Create course
const course = new Course({
  courseId: 'dsa-advanced',
  title: 'Advanced DSA Masterclass'
});

// 2. Auto-generate all lectures
await fetch('/api/courses/dsa-advanced/auto-generate-lectures', {
  method: 'POST',
  body: JSON.stringify({
    topics: [
      'Arrays & Dynamic Sizing',
      'Linked Lists',
      'Stacks & Queues',
      'Binary Search Trees',
      'Balanced Trees (AVL/Red-Black)',
      'Heaps & Priority Queues',
      'Graphs & Traversal',
      'Shortest Path Algorithms',
      'Dynamic Programming',
      'Advanced Sorting'
    ],
    languages: ['en', 'es', 'fr', 'de'],
    level: 'advanced'
  })
});

// 3. Result: 10 lectures, 4 languages each = 40 lecture videos
// All with scripts, visuals, and narration
// Total time: ~15 minutes of setup
// Value: Equivalent to 50+ hours of manual creation
```

## Troubleshooting

**"Lecture generation not starting"**
- Check API keys in `.env`
- Ensure server is running
- Check browser console for fetch errors

**"Audio or visuals are mock/placeholder"**
- Verify ELEVENLABS_API_KEY and RUNWAY_API_KEY are set
- Check API quotas and billing status
- Wait for background generation to complete

**"Lectures take too long"**
- This is normal (2-5 minutes per lecture)
- Parallel generation across multiple topics
- Check server logs for progress

## Future Enhancements

- [ ] Custom avatar presenters
- [ ] Interactive quiz generation
- [ ] Slide deck export
- [ ] Live lecture streaming
- [ ] Student Q&A integration
- [ ] Lecture marketplace
- [ ] AI translation (not just voice)
- [ ] Video chaptering/segments

---

**Ready to generate your first lecture?** Visit `/lectures.html` or use the API!
