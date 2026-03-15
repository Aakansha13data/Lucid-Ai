# LUCID AI — Local Dev Guide

This repo is a small demo site with authentication, notes, and courses.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run the server:

```bash
npm start
```

3. Open the site: http://localhost:3000

Demo user

- username: `demo`
- password: `demo123`

Testing signup → login → enroll flow (automated)

1. Install test deps:

```bash
npm install node-fetch@2 fetch-cookie tough-cookie
```

2. Run the test script:

```bash
node scripts/test-enroll.js
```

What the test does

- Signs up a unique user
- Logs in and maintains session cookies
- Calls `/api/enroll` to enroll in `dsa-101`
- Attempts to GET the course page to verify access

Notes

- This project uses simple file-based persistence (`users.json`). For production, replace with a real DB.
- Course content is protected server-side; only enrolled users may access course template pages.
