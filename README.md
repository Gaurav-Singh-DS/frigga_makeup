# ✦ Frigga Makeup Studio & Academy
### AI-Powered Website — Setup Guide

---

## 📁 Folder Structure

```
frigga-studio/
├── app/
│   ├── index.html       ← Main website
│   ├── style.css        ← All styles
│   └── script.js        ← All JS (calls backend API)
│
└── src/
    ├── server.js        ← Express backend
    ├── skinAnalyzer.js  ← Gemini AI logic
    ├── package.json
    ├── .env             ← YOUR API KEY (create this)
    └── .env.example     ← Template
```

---

## 🚀 How to Run (Step by Step)

### 1. Get Free Gemini API Key
- Go to: https://aistudio.google.com
- Sign in with Google → Get API Key → Create API Key
- Copy the key (starts with `AIzaSy...`)

### 2. Install Node.js (if not installed)
- Download from: https://nodejs.org
- Choose the LTS version

### 3. Set Up the Backend
Open terminal in VS Code (`Ctrl + ~`), then:

```bash
# Go into the src folder
cd src

# Install all packages
npm install

# Create your .env file
copy .env.example .env       # Windows
# OR
cp .env.example .env         # Mac/Linux
```

Now open `.env` and replace `AIzaSyYOUR_KEY_HERE` with your real key.

### 4. Start the Backend Server
```bash
# From inside the /src folder:
npm run dev       # Auto-restarts on changes (recommended)
# OR
npm start         # Normal start
```

You should see:
```
✦ ─────────────────────────────────────── ✦
   FRIGGA MAKEUP STUDIO — AI Backend
   Running at: http://localhost:3001
   Health:     http://localhost:3001/api/health
✦ ─────────────────────────────────────── ✦
```

### 5. Open the Website
- In VS Code, right-click `app/index.html`
- Select **"Open with Live Server"**
- Website opens at `http://127.0.0.1:5500`

### 6. Test the AI Skin Analyzer
- Scroll to the **AI Skin Analysis** section
- Upload a clear face photo (JPG/PNG, max 5MB)
- Click **"Analyze My Skin"**
- Wait ~2–5 seconds for real AI results ✨

---

## 🧪 Test the Backend Directly

Open browser and go to:
```
http://localhost:3001/api/health
```

You should see:
```json
{
  "status": "ok",
  "message": "Frigga AI Backend is running ✦",
  "geminiKey": "✓ Set"
}
```

---

## 🔁 How the AI Feature Works

```
1. User uploads photo in browser
2. JS sends photo to http://localhost:3001/api/analyze-image
3. server.js receives it via Multer
4. skinAnalyzer.js sends image + prompt to Google Gemini Vision API
5. Gemini returns JSON: { skinTone, undertone, hydration, tips... }
6. server.js sends JSON back to browser
7. script.js renders the beautiful results panel
```

---

## 🆓 Free AI Model Used
**Google Gemini 1.5 Flash**
- Free tier: 15 requests/min, 1500/day
- Vision support: ✅ Yes
- Get key: https://aistudio.google.com

---

## ⚠️ Common Issues

| Problem | Fix |
|---------|-----|
| `GEMINI_API_KEY missing` | Check your `.env` file in `/src` |
| `Cannot connect to server` | Make sure `npm run dev` is running in `/src` |
| `CORS error` | Backend already handles CORS — restart server |
| `Analysis failed` | Upload a clear, well-lit face photo |
| `npm not found` | Install Node.js from nodejs.org |

---

## 📞 Studio Contact
**Frigga Makeup Studio & Academy**  
Civil Lines, Prayagraj, UP  
Komal Singh — Lead Artist & Founder