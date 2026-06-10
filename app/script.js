// ============================================
//  script.js — Frigga Makeup Studio
//  All frontend JS — AI calls go to localhost:3001
// ============================================

const API_BASE = "http://localhost:3001/api";

// ── CUSTOM CURSOR ──
const cursor     = document.getElementById("cursor");
const cursorRing = document.getElementById("cursorRing");

document.addEventListener("mousemove", e => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top  = e.clientY + "px";
  setTimeout(() => {
    cursorRing.style.left = e.clientX + "px";
    cursorRing.style.top  = e.clientY + "px";
  }, 80);
});

document.querySelectorAll("button, a, .service-card, .course-card, .gallery-item").forEach(el => {
  el.addEventListener("mouseenter", () => { cursor.style.transform = "translate(-50%,-50%) scale(2)"; });
  el.addEventListener("mouseleave", () => { cursor.style.transform = "translate(-50%,-50%) scale(1)"; });
});

// ── NAV SCROLL ──
window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 80);
});

// ── SCROLL REVEAL ──
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
}, { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// ── HELPERS ──
function scrollToSection(selector) {
  document.querySelector(selector).scrollIntoView({ behavior: "smooth" });
}

function showToast(msg, dur = 3500) {
  const t = document.getElementById("toast");
  t.innerHTML = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), dur);
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
}

document.getElementById("modal").addEventListener("click", e => {
  if (e.target === document.getElementById("modal")) closeModal();
});

// ── BOOKING ──
function openBookingModal() { scrollToSection("#booking"); }

function bookService(name) {
  document.getElementById("bService").value = name;
  scrollToSection("#booking");
  showToast(`✦ <strong>${name}</strong> selected — fill the form to confirm!`);
}

function submitBooking() {
  const name  = document.getElementById("bName").value.trim();
  const phone = document.getElementById("bPhone").value.trim();
  if (!name || !phone) {
    showToast("⚠️ Please fill in your name and phone number.");
    return;
  }
  const service = document.getElementById("bService").value;
  showToast(`🎉 Booking confirmed! <strong>${name}</strong>, we'll call you for <strong>${service}</strong>.`, 5000);
  document.getElementById("bName").value  = "";
  document.getElementById("bPhone").value = "";
  document.getElementById("bNotes").value = "";
}

function enrollCourse(name, fee) {
  document.getElementById("bService").value = "Academy Enrollment";
  document.getElementById("bNotes").value   = "Course: " + name;
  scrollToSection("#booking");
  showToast(`📚 Enrolling for <strong>${name}</strong> (₹${fee}) — complete the form below!`);
}

// ── GALLERY FILTER ──
function filterGallery(cat, btn) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".gallery-item").forEach(item => {
    const show = cat === "all" || item.dataset.cat === cat;
    item.style.opacity   = show ? "1"    : "0.3";
    item.style.transform = show ? ""     : "scale(0.97)";
    item.style.transition = "all 0.3s";
  });
}

// ════════════════════════════════════════════
//  AI SKIN ANALYZER  — Real Gemini Vision API
// ════════════════════════════════════════════
let selectedTone    = null;
let uploadedFile    = null;

// Open file picker
function triggerUpload() {
  document.getElementById("fileInput").click();
}

// Handle file selection — preview + store in memory
function handleFileUpload(input) {
  if (input.files && input.files[0]) {
    uploadedFile = input.files[0];
    const name   = uploadedFile.name;

    // Show preview thumbnail
    const reader = new FileReader();
    reader.onload = e => {
      const zone = document.getElementById("uploadZone");
      zone.innerHTML = `
        <img src="${e.target.result}"
             style="width:80px;height:80px;border-radius:4px;object-fit:cover;margin-bottom:0.8rem;border:2px solid var(--gold);">
        <p><strong style="color:var(--gold);">✓ ${name}</strong></p>
        <p style="font-size:0.75rem;margin-top:0.3rem;opacity:0.5;">Click to change photo</p>
      `;
      zone.onclick = triggerUpload;
    };
    reader.readAsDataURL(uploadedFile);

    showToast('📷 Photo ready! Click <strong>"Analyze My Skin"</strong> to proceed.');
  }
}

// Skin tone manual selection
function selectTone(el, tone) {
  document.querySelectorAll(".tone-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  selectedTone = tone;
  showToast(`✦ Skin tone selected: <strong>${tone}</strong>`);
}

// ── MAIN: Run AI Analysis ──
async function runAIAnalysis() {
  const hasFile = uploadedFile !== null;
  const hasTone = selectedTone !== null;

  if (!hasFile && !hasTone) {
    showToast("⚠️ Please upload a photo or select a skin tone first.");
    return;
  }

  // Show loading state
  const resultsEl  = document.getElementById("aiResults");
  const loadingEl  = document.getElementById("aiLoading");
  resultsEl.style.display  = "none";
  loadingEl.style.display  = "block";

  try {
    let result;

    if (hasFile) {
      // ── PATH A: Real AI vision analysis from uploaded photo ──
      result = await sendImageToAPI(uploadedFile);
    } else {
      // ── PATH B: Manual tone selected — use backend profile ──
      result = await sendToneToAPI(selectedTone);
    }

    loadingEl.style.display = "none";

    if (!result.success) {
      resultsEl.style.display = "block";
      document.getElementById("resultsBody").innerHTML = `
        <p style="color:#ff6b6b;font-size:0.9rem;padding:1rem 0;text-align:center;">
          ⚠️ ${result.error}
        </p>`;
      return;
    }

    renderResults(result.data);
    resultsEl.style.display = "block";
    showToast("✦ Skin analysis complete!");

  } catch (err) {
    loadingEl.style.display = "none";
    resultsEl.style.display = "block";
    document.getElementById("resultsBody").innerHTML = `
      <p style="color:#ff6b6b;font-size:0.9rem;padding:1rem 0;text-align:center;">
        ⚠️ Could not connect to AI server. Make sure it is running on port 3001.
      </p>`;
    console.error("AI Analysis error:", err);
  }
}

// ── Send image file to backend ──
async function sendImageToAPI(file) {
  const formData = new FormData();
  formData.append("photo", file);

  const response = await fetch(`${API_BASE}/analyze-image`, {
    method: "POST",
    body: formData
    // Do NOT set Content-Type — browser sets it with boundary automatically
  });

  return await response.json();
}

// ── Send tone string to backend ──
async function sendToneToAPI(tone) {
  const response = await fetch(`${API_BASE}/analyze-tone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tone })
  });

  return await response.json();
}

// ── Render the AI results into the results panel ──
function renderResults(d) {
  const resultsBody = document.getElementById("resultsBody");

  resultsBody.innerHTML = `
    <div class="result-row">
      <span class="result-label">Skin Tone</span>
      <span class="result-value">${d.skinTone || "—"}</span>
    </div>
    <div class="result-row">
      <span class="result-label">Undertone</span>
      <span class="result-value">${d.undertone || "—"}</span>
    </div>
    <div class="result-row">
      <span class="result-label">Skin Type</span>
      <span class="result-value">${d.skinType || "—"}</span>
    </div>

    <div style="margin-bottom:1rem;">
      <div class="result-row" style="margin-bottom:0.4rem;">
        <span class="result-label">Hydration Level</span>
        <span class="result-value">${d.hydrationLevel ?? "—"}/100</span>
      </div>
      <div class="result-bar">
        <div class="result-fill" style="width:${d.hydrationLevel ?? 0}%"></div>
      </div>
    </div>

    <div style="margin-bottom:1rem;">
      <div class="result-row" style="margin-bottom:0.4rem;">
        <span class="result-label">Radiance Score</span>
        <span class="result-value">${d.radianceScore ?? "—"}/100</span>
      </div>
      <div class="result-bar">
        <div class="result-fill" style="width:${d.radianceScore ?? 0}%"></div>
      </div>
    </div>

    <div class="result-row">
      <span class="result-label">Key Concerns</span>
      <span class="result-value">${Array.isArray(d.keyConcerns) ? d.keyConcerns.join(", ") : (d.keyConcerns || "—")}</span>
    </div>

    <div class="result-row">
      <span class="result-label">Foundation Shade</span>
      <span class="result-value">${d.foundationShade || "—"}</span>
    </div>

    ${d.makeupTips ? `
    <div style="margin:1.2rem 0;padding:1rem;background:rgba(201,169,110,0.08);border-left:2px solid var(--gold);border-radius:2px;">
      <div style="font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:rgba(250,247,243,0.4);margin-bottom:0.4rem;">💄 Makeup Tip</div>
      <div style="font-size:0.85rem;color:rgba(250,247,243,0.8);line-height:1.6;">${d.makeupTips}</div>
    </div>` : ""}

    ${d.skincareTip ? `
    <div style="margin:1rem 0;padding:1rem;background:rgba(200,132,122,0.08);border-left:2px solid var(--rose);border-radius:2px;">
      <div style="font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:rgba(250,247,243,0.4);margin-bottom:0.4rem;">🌿 Skincare Tip</div>
      <div style="font-size:0.85rem;color:rgba(250,247,243,0.8);line-height:1.6;">${d.skincareTip}</div>
    </div>` : ""}

    <div class="product-recs">
      <h5>Recommended Products</h5>
      ${(d.recommendedProducts || []).map(p =>
        `<span class="rec-chip">${p}</span>`
      ).join("")}
    </div>

    <div style="margin-top:1.5rem;">
      <button
        style="background:transparent;border:1px solid rgba(201,169,110,0.4);color:var(--gold);
               padding:0.6rem 1.4rem;font-size:0.8rem;letter-spacing:0.08em;text-transform:uppercase;
               cursor:pointer;border-radius:2px;width:100%;transition:all 0.2s;"
        onclick="scrollToSection('#booking'); showToast('✦ Book a full skin consultation session!')">
        Book Full Consultation →
      </button>
    </div>
  `;
}

// ════════════════════════════════════════════
//  AI LOOK GENERATOR  (client-side logic)
// ════════════════════════════════════════════
function generateLook() {
  const occ    = document.getElementById("occSelect").value;
  const tone   = document.getElementById("toneSelect").value;
  const style  = document.getElementById("styleSelect").value;
  const eyes   = document.getElementById("eyeSelect").value;
  const outfit = document.getElementById("outfitColor").value;

  const placeholder = document.getElementById("lookPlaceholder");
  const output      = document.getElementById("lookOutput");
  const loading     = document.getElementById("lookLoading");

  placeholder.style.display = "none";
  output.style.display      = "none";
  loading.style.display     = "block";

  const lookData = {
    "Classic & Elegant": {
      steps: [
        { title: "Skin Prep & Primer",  desc: "Apply hydrating primer to create a smooth canvas. Use a pore-minimizing primer on the T-zone for longevity." },
        { title: "Flawless Base",       desc: `Match your ${tone} skin with a buildable-coverage satin foundation. Blend with a damp sponge.` },
        { title: "Sculpt & Highlight",  desc: "Subtle contour under cheekbones. Apply champagne highlighter to the cheekbones, nose bridge, and cupid's bow." },
        { title: "Eye Drama",           desc: `Perfect for ${eyes} — champagne shimmer on lid, matte taupe in crease, precise fine wing liner.` },
        { title: "Lashes & Brows",      desc: "Volume mascara or individual lashes. Hair-stroke brow technique in a shade slightly lighter than your hair." },
        { title: "Lip",                 desc: "Nude liner + nude-rose satin bullet lipstick. Blot and reapply for longevity." }
      ],
      products: ["Satin Foundation", "Champagne Highlighter", "Nude Rose Lipstick", "Volume Mascara", "Setting Spray"]
    },
    "Bold & Dramatic": {
      steps: [
        { title: "Full Matte Base",     desc: "Full-coverage matte foundation. Bake under eyes and T-zone with translucent powder." },
        { title: "Heavy Contour",       desc: "Sculpt cheekbones, jaw, and temples with a cool-toned powder. Blend sharply." },
        { title: "Dramatic Cut-Crease", desc: `Ideal for ${eyes} — matte black outer corner, blended brown in crease, crisp cut-crease line.` },
        { title: "Bold Liner",          desc: "Thick cat-eye or graphic liner. White inner corner highlight for contrast." },
        { title: "Statement Lip",       desc: "Deep berry, wine, or classic red. Overline slightly. Set with lip powder." },
        { title: "Set & Lock",          desc: "Heavy-duty setting spray to seal everything. Blot shine for camera-ready finish." }
      ],
      products: ["Matte Foundation", "Cut-Crease Palette", "Drama Liner", "Berry Lipstick", "Long-wear Setting Spray"]
    },
    "Natural & Dewy": {
      steps: [
        { title: "Skincare-First Prep", desc: "Double moisturise and apply facial oil. Skin should look naturally plump before any product." },
        { title: "Skin Tint Base",      desc: "Mix serum foundation with moisturiser for sheer, breathable finish. Apply with fingers." },
        { title: "Strategic Highlight", desc: "Liquid highlighter on cheekbones, nose bridge, and brow bone for inner glow." },
        { title: "Glossy Eye",          desc: `For ${eyes} — clear gloss or subtle shimmer on lids. No liner. Defined lashes only.` },
        { title: "Fluffy Brows",        desc: "Soap brows or clear gel for a feathery, natural-looking arch." },
        { title: "MLBB Lip",            desc: "My-lips-but-better tinted balm or gloss in your most natural flush colour." }
      ],
      products: ["Serum Foundation", "Liquid Highlighter", "Clear Brow Gel", "MLBB Lip Balm", "Facial Mist"]
    }
  };

  const data = lookData[style] || lookData["Classic & Elegant"];

  setTimeout(() => {
    loading.style.display = "none";
    output.style.display  = "block";

    document.getElementById("lookTitle").textContent    = `${style} Look`;
    document.getElementById("lookSubtitle").textContent =
      `${occ} · ${tone} Skin · ${eyes}${outfit ? " · Outfit: " + outfit : ""}`;

    document.getElementById("lookSteps").innerHTML = data.steps.map((s, i) => `
      <li>
        <div class="step-num">${i + 1}</div>
        <div class="step-content"><h5>${s.title}</h5><p>${s.desc}</p></div>
      </li>`).join("");

    document.getElementById("lookProductTags").innerHTML = data.products.map(p =>
      `<span class="rec-chip" style="background:var(--rose-light);color:var(--rose-dark);border:1px solid var(--rose);">${p}</span>`
    ).join("");

    showToast("✦ Your personalized look is ready!");
  }, 1800);
}

// ── Init: set minimum booking date to today ──
(function initDate() {
  const dateInput = document.getElementById("bDate");
  if (dateInput) {
    dateInput.setAttribute("min", new Date().toISOString().split("T")[0]);
  }
})();