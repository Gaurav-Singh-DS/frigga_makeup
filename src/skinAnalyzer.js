// ============================================
//  skinAnalyzer.js — Frigga Makeup Studio
//  LOCAL AI: Ollama + moondream (FREE, no GPU)
//  Auto-compresses image before sending
// ============================================

require("dotenv").config();
const fetch = require("node-fetch");
const sharp = require("sharp");

const OLLAMA_URL   = process.env.OLLAMA_URL   || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "moondream";

// ── DETAILED PROMPT for accurate skin analysis (ALL SKIN TONES) ──
const SKIN_PROMPT = `You are an expert makeup artist and skin analyst with expertise in ALL skin tones. Analyze the face in this image carefully and provide ONLY a valid JSON response with ZERO markdown formatting.

SKIN TONE DETECTION GUIDE:
- FAIR: Very light, porcelain-like, appears pale or light pink
- LIGHT: Light but not porcelain, slightly deeper than Fair
- MEDIUM: Mid-range tone, most common range (olive, beige, warm)
- TAN: Deeper warm tone, golden or peachy undertones visible
- BROWN: Rich brown tone, warm golden-brown to deep warm brown
- DEEP: Very dark skin, rich deep brown to very dark brown/black skin tone. LOOK CAREFULLY at jaw, neck, and inner arm areas to see true depth. Don't underestimate darkness.

UNDERTONE DETECTION FOR DARK SKIN:
- COOL: Blue, purple, pink, or red undertones visible in dark skin (appears slightly purplish or reddish)
- WARM: Golden, red-orange, or peachy undertones (appears warm-toned)
- OLIVE: Green or gray undertones mixed with warm (appears olive-toned)
- NEUTRAL: Mix of cool and warm undertones (balanced)

ANALYSIS INSTRUCTIONS:
1. SKIN TONE: Examine jaw, forehead, inner cheek, neck area. For dark skin, look at areas with good lighting to see true depth. Don't mistake shadows for lighter tone. If very dark = Deep.
2. UNDERTONE: Look at vein color, lip color, and how skin reflects light. Cool = blue/purple cast, Warm = golden/peachy cast, Olive = greenish cast
3. SKIN TYPE: Examine T-zone, pores, shine level, visible dryness or flakiness - is it Oily, Dry, Combination, Normal, Sensitive, or Mixed?
4. HYDRATION LEVEL (0-100): Dry/flaky = 20-40, Normal = 50-70, Dewy/plump = 70-85
5. RADIANCE SCORE (0-100): How bright and glowing? Dull = 30-50, Normal = 50-70, Glowing = 70-90
6. KEY CONCERNS: For ALL skin tones look for: acne, dark spots, hyperpigmentation, uneven tone, visible pores, oiliness, dryness, dullness, redness, sensitivity
7. FOUNDATION SHADE: Use REAL brands with shade numbers. For deep skin: MAC NW55-NW65, Fenty 490-510, Black Up 100+, Revlon True Black 400 series
8. PRODUCTS: Suggest 3-4 specific products addressing their actual concerns
9. MAKEUP TIPS: Specific to their tone, undertone, and skin type
10. SKINCARE TIPS: Address their specific concerns and skin tone needs

CRITICAL FOR DEEP/DARK SKIN:
- Don't default to Brown if it's very dark - could be Deep
- Check for hyperpigmentation and uneven tone (common in dark skin)
- Recommend products that show up on dark skin (not white/pale products)
- Consider undertone carefully - cool deep skin needs different shades than warm deep skin

Return ONLY valid JSON, no markdown, no explanation. No code blocks. No triple backticks.
{
  "skinTone": "string (Fair/Light/Medium/Tan/Brown/Deep)",
  "undertone": "string (Cool/Warm/Neutral/Olive)",
  "skinType": "string (Oily/Dry/Combination/Normal/Sensitive/Mixed)",
  "hydrationLevel": number (0-100),
  "radianceScore": number (0-100),
  "keyConcerns": ["concern1", "concern2", "concern3"],
  "foundationShade": "Brand Shade (e.g., MAC NW55, Fenty 490N, Black Up 200, Revlon True Black 410)",
  "recommendedProducts": ["product1 with specific benefit", "product2", "product3", "product4"],
  "makeupTips": "Tip 1 for this skin tone and undertone. Tip 2 for this skin type. Tip 3 for their specific concerns.",
  "skincareTip": "Tip 1 addressing key concern. Tip 2 for hydration/maintenance. Tip 3 addressing their specific skin issues."
}`;

// ── Safe JSON parser ──
function parseJSON(text) {
  let clean = text.replace(/```json|```/gi, "").trim();
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new SyntaxError("No JSON found");
  return JSON.parse(clean.slice(start, end + 1));
}

// ── AUTO COMPRESS: resize to max 512px wide, convert to JPEG ──
async function compressImage(buffer) {
  try {
    const compressed = await sharp(buffer)
      .resize({ width: 512, withoutEnlargement: true })  // max 512px wide
      .jpeg({ quality: 70 })                              // compress to 70% quality
      .toBuffer();

    const originalKB   = (buffer.length   / 1024).toFixed(0);
    const compressedKB = (compressed.length / 1024).toFixed(0);
    console.log(`🗜️  Image compressed: ${originalKB}KB → ${compressedKB}KB`);
    return compressed;
  } catch (err) {
    console.warn("⚠️  Compression failed, using original:", err.message);
    return buffer; // fallback to original if sharp fails
  }
}

// ── MANUAL PROFILES (tone-selector path) ──
const MANUAL_PROFILES = {
  Fair:   { skinTone:"Fair",   undertone:"Cool",    skinType:"Combination",         hydrationLevel:60, radianceScore:72, keyConcerns:["Redness","Sensitivity"],             foundationShade:"MAC NW10 / Maybelline N15", recommendedProducts:["Charlotte Tilbury Flawless Filter","NARS Sheer Glow N15","La Roche-Posay Toleriane"], makeupTips:"Use a green colour-corrector before foundation to neutralise redness. Opt for light-coverage formulas.",          skincareTip:"Use a gentle fragrance-free moisturiser with ceramides daily." },
  Light:  { skinTone:"Light",  undertone:"Neutral", skinType:"Normal to Dry",       hydrationLevel:55, radianceScore:70, keyConcerns:["Dullness","Dehydration"],             foundationShade:"MAC NC15 / Fenty 140W",     recommendedProducts:["Huda Beauty #Fauxfilter Vanilla","NARS Syracuse","CeraVe Moisturising Cream"],           makeupTips:"Add a luminous primer under foundation for a dewy glow. Peach blush complements your neutral undertone.",         skincareTip:"Incorporate hyaluronic acid serum in your morning routine to boost hydration." },
  Medium: { skinTone:"Medium", undertone:"Warm",    skinType:"Normal to Oily",      hydrationLevel:65, radianceScore:78, keyConcerns:["Dark Spots","T-zone Oiliness"],       foundationShade:"MAC NC30 / Fenty 240W",     recommendedProducts:["Fenty Beauty Pro Filt'r 240W","NYX Can't Stop W25","Niacinamide Serum"],                 makeupTips:"Use a mattifying primer on the T-zone. Warm terracotta blush and bronzer enhance your golden undertone.",         skincareTip:"Apply niacinamide serum to fade dark spots and control sebum." },
  Tan:    { skinTone:"Tan",    undertone:"Warm",    skinType:"Oily to Combination", hydrationLevel:68, radianceScore:80, keyConcerns:["Hyperpigmentation","Visible Pores"],  foundationShade:"MAC NC42 / Fenty 345W",     recommendedProducts:["Bobbi Brown W-055","NARS Deauville","Vitamin C Serum"],                                   makeupTips:"Use full-coverage foundation set with translucent powder. Warm copper eyeshadow looks stunning on you.",          skincareTip:"Use Vitamin C serum every morning to brighten and reduce hyperpigmentation." },
  Brown:  { skinTone:"Brown",  undertone:"Warm",    skinType:"Normal",              hydrationLevel:70, radianceScore:82, keyConcerns:["Ashy Finish","Product Oxidation"],    foundationShade:"MAC NW40 / Fenty 420W",     recommendedProducts:["Fenty Beauty Pro Filt'r 420W","NYX Total Control W55","Shea Butter Moisturiser"],        makeupTips:"Avoid oxidising foundations — test on jawline first. Deep burgundy lips complement your skin beautifully.",       skincareTip:"Use rich shea butter moisturiser to prevent ashy skin." },
  Deep:   { skinTone:"Deep",   undertone:"Cool",    skinType:"Dry to Normal",       hydrationLevel:62, radianceScore:85, keyConcerns:["Ashiness","Product Oxidation"],       foundationShade:"MAC NW55 / Fenty 490N",     recommendedProducts:["Pat McGrath Skin Fetish D30","Bobbi Brown Espresso 8","Glycerin Moisturiser"],            makeupTips:"Bold jewel-toned eyeshadows and vibrant lip colours are made for your skin tone. Avoid ashy highlight powders.", skincareTip:"Use glycerin-based toner to lock in moisture and maintain a natural sheen." }
};

// ════════════════════════════════════════════
//  MAIN: Compress → Send to Ollama
// ════════════════════════════════════════════
async function analyzeFromImage(imageBuffer, mimeType) {
  try {
    // ── Step 1: Compress image ──
    const smallBuffer = await compressImage(imageBuffer);
    const base64Image = smallBuffer.toString("base64");

    console.log(`🤖 Sending to Ollama (${OLLAMA_MODEL})...`);

    const body = {
      model:  OLLAMA_MODEL,
      prompt: SKIN_PROMPT,
      images: [base64Image],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 300   // reduced — less tokens = faster
      }
    };

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      timeout: 180000   // 3 min — enough for 5th gen CPU
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 404 || errText.includes("model")) {
        return { success: false, error: `Model '${OLLAMA_MODEL}' not found. Run: ollama pull ${OLLAMA_MODEL}` };
      }
      throw new Error(`Ollama HTTP ${response.status}: ${errText.slice(0, 100)}`);
    }

    const json = await response.json();
    const text = json.response?.trim() || "";

    console.log("🔤 Raw response:", text.slice(0, 250));

    if (!text) return { success: false, error: "Ollama returned empty response. Try again." };

    // ── Parse JSON ──
    let data;
    try {
      data = parseJSON(text);
    } catch (e) {
      console.warn("⚠️  JSON parse failed — using smart extractor");
      data = extractFromText(text);
    }

    console.log("✅ Analysis complete!");
    return { success: true, data, provider: `Ollama (${OLLAMA_MODEL})` };

  } catch (err) {
    console.error("❌ Error:", err.message?.slice(0, 150));

    if (err.code === "ECONNREFUSED")
      return { success: false, error: "Ollama not running. Open terminal and run: ollama serve" };

    if (err.type === "request-timeout" || err.message?.includes("timeout"))
      return { success: false, error: "Timed out. Image was compressed but CPU still slow — please try again." };

    return { success: false, error: "Local AI error: " + (err.message?.slice(0, 80) || "Unknown") };
  }
}

// ── Fallback: extract skin info from plain text if JSON fails ──
function extractFromText(text) {
  const lower = text.toLowerCase();
  let skinTone = "Medium";
  if      (lower.includes("fair") || lower.includes("pale"))         skinTone = "Fair";
  else if (lower.includes("light"))                                   skinTone = "Light";
  else if (lower.includes("tan"))                                     skinTone = "Tan";
  else if (lower.includes("brown"))                                   skinTone = "Brown";
  else if (lower.includes("dark") || lower.includes("deep"))         skinTone = "Deep";

  let undertone = "Warm";
  if      (lower.includes("cool") || lower.includes("pink"))         undertone = "Cool";
  else if (lower.includes("olive"))                                   undertone = "Olive";
  else if (lower.includes("neutral"))                                 undertone = "Neutral";

  let skinType = "Combination";
  if      (lower.includes("oily") || lower.includes("shine"))        skinType = "Oily";
  else if (lower.includes("dry")  || lower.includes("flak"))         skinType = "Dry";
  else if (lower.includes("normal"))                                  skinType = "Normal";

  return {
    ...MANUAL_PROFILES[skinTone],
    skinTone, undertone, skinType
  };
}

// ── Manual tone path ──
function analyzeFromTone(tone) {
  const profile = MANUAL_PROFILES[tone];
  if (!profile) return { success: false, error: "Invalid skin tone." };
  return { success: true, data: profile, provider: "Manual" };
}

module.exports = { analyzeFromImage, analyzeFromTone };