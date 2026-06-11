// ============================================
//  server.js — Frigga Makeup Studio Backend
//  Express + Multer + Local Ollama Vision
// ============================================

require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const multer   = require("multer");
const path     = require("path");
const nodemailer = require("nodemailer");
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

// ── EMAIL TRANSPORTER (Gmail) ──
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "friggamakeupstudio@gmail.com",
    pass: process.env.EMAIL_PASS || ""  // Use App Password (not regular password)
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

// ── BOOKING SUBMISSION ──
app.post("/api/submit-booking", async (req, res) => {
  try {
    const { name, phone, email, service, date, time, notes } = req.body;

    // Validate
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "Name and phone are required." });
    }

    const ownerEmail = "gauravsingh99984@gmail.com"; // Your email
    const bookingTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // ═══════════════════════════════════════════
    // EMAIL 1: TO STUDIO OWNER (Gaurav)
    // ═══════════════════════════════════════════
    const studioMailOptions = {
      from: process.env.EMAIL_USER,
      to: ownerEmail,
      subject: `🎉 NEW BOOKING ALERT - ${service}`,
      html: `
        <div style="font-family:Arial;padding:20px;background:#f5f5f5;border-radius:8px;max-width:600px;">
          <h2 style="color:#1F9B8E;border-bottom:2px solid #1F9B8E;padding-bottom:10px;">✦ New Booking Received</h2>
          
          <div style="background:white;padding:20px;border-radius:4px;margin:20px 0;border-left:4px solid #1F9B8E;">
            <h3 style="margin-top:0;color:#0F0F0F;">Customer Details:</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;font-weight:bold;width:30%;">Name:</td>
                <td style="padding:10px;">${name}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;font-weight:bold;">Phone:</td>
                <td style="padding:10px;"><a href="tel:${phone}" style="color:#1F9B8E;text-decoration:none;">${phone}</a></td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;font-weight:bold;">Email:</td>
                <td style="padding:10px;"><a href="mailto:${email || "N/A"}" style="color:#1F9B8E;text-decoration:none;">${email || "Not provided"}</a></td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;font-weight:bold;">Service:</td>
                <td style="padding:10px;"><strong style="color:#1F9B8E;">${service}</strong></td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;font-weight:bold;">Date:</td>
                <td style="padding:10px;">${date || "To be confirmed"}</td>
              </tr>
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;font-weight:bold;">Time:</td>
                <td style="padding:10px;">${time || "To be confirmed"}</td>
              </tr>
              <tr>
                <td style="padding:10px;font-weight:bold;">Notes:</td>
                <td style="padding:10px;">${notes || "None"}</td>
              </tr>
            </table>
          </div>
          
          <div style="background:#f0f0f0;padding:15px;border-radius:4px;margin-top:20px;">
            <p style="margin:0;color:#666;font-size:12px;">
              <strong>Booked at:</strong> ${bookingTime}<br>
              <strong>Action:</strong> Please follow up with the customer to confirm appointment details.
            </p>
          </div>
        </div>
      `
    };

    // ═══════════════════════════════════════════
    // EMAIL 2: TO CUSTOMER (User)
    // ═══════════════════════════════════════════
    const customerMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "✦ Booking Confirmation - Frigga Makeup Studio",
      html: `
        <div style="font-family:Arial;padding:20px;background:#f5f5f5;border-radius:8px;max-width:600px;">
          <h2 style="color:#1F9B8E;border-bottom:2px solid #1F9B8E;padding-bottom:10px;">✦ Your Booking is Confirmed!</h2>
          
          <div style="background:white;padding:20px;border-radius:4px;margin:20px 0;">
            <p style="font-size:16px;color:#0F0F0F;">Hi <strong>${name}</strong>,</p>
            
            <p style="color:#5A5A5A;line-height:1.6;">
              Thank you for choosing <strong>Frigga Makeup Studio</strong>! 💄 We're excited to transform your look.
            </p>
            
            <div style="background:#f0f8f6;padding:15px;border-radius:4px;border-left:4px solid #1F9B8E;margin:20px 0;">
              <h3 style="margin-top:0;color:#1F9B8E;">Your Booking Details:</h3>
              <p style="margin:5px 0;"><strong>Service:</strong> ${service}</p>
              <p style="margin:5px 0;"><strong>Date:</strong> ${date || "To be confirmed by us"}</p>
              <p style="margin:5px 0;"><strong>Time:</strong> ${time || "To be confirmed by us"}</p>
              <p style="margin:5px 0;"><strong>Phone:</strong> ${phone}</p>
            </div>
            
            <p style="color:#5A5A5A;line-height:1.6;">
              Our team will contact you shortly to confirm the exact appointment time and discuss your specific requirements.
            </p>
            
            <p style="color:#5A5A5A;line-height:1.6;margin-top:20px;">
              <strong>Questions?</strong> Reach out to us anytime at:<br>
              📧 <a href="mailto:gauravsingh99984@gmail.com" style="color:#1F9B8E;text-decoration:none;">gauravsingh99984@gmail.com</a><br>
              💬 <a href="https://wa.me/918840997965" style="color:#1F9B8E;text-decoration:none;">WhatsApp: +91 8840997965</a>
            </p>
            
            <p style="color:#1F9B8E;font-size:14px;margin-top:20px;">
              <strong>🌟 Get ready to look and feel your absolute best! 🌟</strong>
            </p>
          </div>
          
          <p style="color:#999;font-size:12px;text-align:center;margin-top:30px;">
            Frigga Makeup Studio | Professional Makeup Artistry & Academy<br>
            Delhi, India
          </p>
        </div>
      `
    };

    // Send email to studio owner
    await transporter.sendMail(studioMailOptions);
    console.log(`✉️  Studio owner notified: ${ownerEmail}`);

    // Send confirmation email to customer
    if (email) {
      await transporter.sendMail(customerMailOptions);
      console.log(`✉️  Customer confirmation sent: ${email}`);
    }

    return res.status(200).json({
      success: true,
      message: "✓ Booking confirmed! Confirmation email sent.",
      bookingId: Date.now()
    });

  } catch (error) {
    console.error("❌ Booking error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process booking"
    });
  }
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