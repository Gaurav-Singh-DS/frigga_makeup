// ============================================
//  server.js — Frigga Makeup Studio Backend
//  Express + Multer + Local Ollama Vision
// ============================================

require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const multer   = require("multer");
const path     = require("path");
const { analyzeFromImage, analyzeFromTone } = require("./skinAnalyzer");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ──
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../app")));

// ── MULTER ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG/PNG/WEBP allowed"));
  }
});

// ── ROUTES ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Frigga AI Backend running ✦", port: PORT });
});

app.post("/api/analyze-image", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "No image uploaded." });
  console.log(`📷 Image received: ${req.file.originalname} (${(req.file.size/1024).toFixed(1)} KB)`);
  const result = await analyzeFromImage(req.file.buffer, req.file.mimetype);
  return res.status(result.success ? 200 : 422).json(result);
});

app.post("/api/analyze-tone", (req, res) => {
  const { tone } = req.body;
  if (!tone) return res.status(400).json({ success: false, error: "Skin tone required." });
  return res.json(analyzeFromTone(tone));
});

// ── HANDLE PORT IN USE — auto-try next port ──
const server = app.listen(PORT, () => {
  console.log("\n✦ ─────────────────────────────────────── ✦");
  console.log("   FRIGGA MAKEUP STUDIO — AI Backend");
  console.log(`   Running at: http://localhost:${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/api/health`);
  console.log("✦ ─────────────────────────────────────── ✦\n");
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const newPort = parseInt(PORT) + 1;
    console.log(`\n⚠️  Port ${PORT} is busy — trying port ${newPort}...`);
    app.listen(newPort, () => {
      console.log(`✅ Now running on http://localhost:${newPort}`);
      console.log(`   Update API_BASE in your app/script.js to: http://localhost:${newPort}/api\n`);
    });
  } else {
    console.error("Server error:", err);
  }
});