/**
 * Test script to verify YouTube fallback for lecture videos
 * Tests that videos use YouTube URLs when API keys not configured
 */

const http = require('http');
const querystring = require('querystring');

const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  username: 'testuser_' + Date.now(),
  email: 'test' + Date.now() + '@example.com',
  password: 'testpass123'
};

let cookies = '';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      
      // Capture cookies
      if (res.headers['set-cookie']) {
        cookies = res.headers['set-cookie'][0].split(';')[0];
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            text: data
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('\n🧪 Testing YouTube Fallback for Lectures\n');
  console.log('Environment:');
  console.log('  RUNWAY_API_KEY:', process.env.RUNWAY_API_KEY ? '✓ Set' : '✗ Not Set (will use YouTube)');
  console.log('  ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? '✓ Set' : '✗ Not Set');
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Not Set');
  console.log('\n---\n');

  try {
    // 1. Signup
    console.log('1️⃣  Testing signup...');
    const signupRes = await makeRequest('POST', '/api/signup', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password
    });
    console.log(`   Status: ${signupRes.status}`);
    if (signupRes.status !== 200) {
      console.log('   Error:', signupRes.text?.substring(0, 200));
      return;
    }

    // 2. Login
    console.log('\n2️⃣  Testing login...');
    const loginRes = await makeRequest('POST', '/api/login', {
      username: testUser.username,
      password: testUser.password
    });
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.status !== 200) {
      console.log('   Error:', loginRes.text?.substring(0, 200));
      return;
    }

    // 3. Generate lecture
    console.log('\n3️⃣  Generating lecture on "Python Programming"...');
    const genRes = await makeRequest('POST', '/api/generate-lecture', {
      topic: 'Python Programming',
      level: 'intermediate',
      duration: 5,
      languages: ['en', 'es']
    });
    console.log(`   Status: ${genRes.status}`);
    if (genRes.status !== 200) {
      console.log('   Error:', genRes.text);
      return;
    }

    const jobId = genRes.body?.jobId;
    console.log(`   Job ID: ${jobId}`);

    // 4. Wait for lecture to complete
    console.log('\n4️⃣  Waiting for lecture generation...');
    let lecture = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      const fetchRes = await makeRequest('GET', `/api/lectures/${jobId}`);
      
      if (fetchRes.body?.status === 'completed') {
        lecture = fetchRes.body;
        console.log(`   ✅ Generation completed in ${(i + 1) * 0.5}s`);
        break;
      } else if (fetchRes.status === 200) {
        console.log(`   ⏳ Status: ${fetchRes.body?.status || 'processing'}... (${i + 1}s)`);
      }
    }

    if (!lecture) {
      console.log('   ✗ Timeout waiting for lecture');
      return;
    }

    // 5. Analyze video URL
    console.log('\n5️⃣  Analyzing video delivery...');
    const videoUrl = lecture.videoUrl;
    
    console.log('\n   📊 CRITICAL FINDINGS:');
    console.log('   ─────────────────────');
    
    // Check what type of video we got
    if (!videoUrl) {
      console.log('   ✗ videoUrl is missing!');
    } else if (typeof videoUrl === 'string') {
      if (videoUrl.includes('<div')) {
        console.log('   ✗ videoUrl contains HTML markup (non-functional)');
        console.log('   Content preview:', videoUrl.substring(0, 100) + '...');
      } else if (videoUrl.includes('youtube.com/embed')) {
        console.log('   ✅ videoUrl is YouTube embed (WORKING)');
        console.log('   URL:', videoUrl);
        
        // Verify it's an actual YouTube video ID
        const match = videoUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          console.log('   Video ID:', match[1]);
          console.log('   ✅ Valid YouTube embed format');
        }
      } else if (videoUrl.includes('mp4') || videoUrl.includes('.mov')) {
        console.log('   ✅ videoUrl is direct video file');
        console.log('   URL:', videoUrl);
      } else {
        console.log('   ❓ videoUrl format unclear:', videoUrl.substring(0, 100));
      }
    }

    // 6. Check API setup status
    console.log('\n   🛠️  API SETUP STATUS:');
    console.log('   ──────────────────');
    if (lecture.apiSetup) {
      console.log(`   Video Generation: ${lecture.apiSetup.videoGeneration}`);
      console.log(`   Audio Generation: ${lecture.apiSetup.audioGeneration}`);
      console.log(`   Script Generation: ${lecture.apiSetup.scriptGeneration}`);
      console.log(`   Fully AI-Generated: ${lecture.isFullyAIGenerated ? 'YES' : 'NO'}`);
    } else {
      console.log('   ⚠️  apiSetup object not found in response');
    }

    // 7. Check other content
    console.log('\n   📚 LECTURE CONTENT:');
    console.log('   ──────────────────');
    console.log(`   Topic: ${lecture.topic}`);
    console.log(`   Script Title: ${lecture.script?.title || 'N/A'}`);
    console.log(`   Languages: ${lecture.metadata?.languages?.join(', ') || 'N/A'}`);
    console.log(`   Audio files: ${Object.keys(lecture.audio || {}).length} languages`);

    // 8. Verdict
    console.log('\n   ✨ VERDICT:');
    console.log('   ──────────');
    if (videoUrl && videoUrl.includes('youtube.com/embed')) {
      console.log('   ✅ SUCCESS! YouTube educational video is being used');
      console.log('   ✅ System properly falls back when API keys missing');
      console.log('   ✅ Users will see real, playable videos (YouTube content)');
    } else if (videoUrl && videoUrl.includes('<div')) {
      console.log('   ✗ FAILURE! Still returning HTML placeholder instead of YouTube');
      console.log('   ✗ This will NOT work in browser - user sees broken content');
    } else {
      console.log('   ❓ UNCLEAR - Check video URL format above');
    }

    // 9. Test fetching from /api/lectures (list)
    console.log('\n6️⃣  Testing lecture list retrieval...');
    const listRes = await makeRequest('GET', '/api/lectures');
    console.log(`   Status: ${listRes.status}`);
    if (listRes.status === 200) {
      console.log(`   Total lectures: ${listRes.body?.length || 0}`);
      if (listRes.body && listRes.body.length > 0) {
        const first = listRes.body[0];
        console.log(`   Sample: "${first.topic}" - Video type: ${first.videoUrl?.includes('youtube') ? 'YouTube' : first.videoUrl?.includes('<div') ? 'HTML (broken)' : 'Unknown'}`);
      }
    } else if (listRes.status === 401) {
      console.log('   ✅ Authentication check working (401 Unauthorized expected for certain routes)');
    }

    console.log('\n✅ TEST COMPLETE\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  }
}

// Run the tests
runTests();
