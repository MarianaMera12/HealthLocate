// Professional line icons per category (inherit currentColor)
const ICONS = {
  income: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  diversity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  environment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>',
  transit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="4" x2="7" y2="10"/><line x1="17" y1="4" x2="17" y2="10"/><circle cx="7.5" cy="20" r="1.4"/><circle cx="16.5" cy="20" r="1.4"/></svg>',
  // Community-at-a-glance + location icons
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  medical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  // Social Prescribing service icons
  // Pharmacy — pill + Rx cross
  pharmacy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  // Mental health — head in profile with a caring heart
  mental: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 21v-3.5a5.5 5.5 0 0 0 3.5-5A6 6 0 0 0 13 6.5 6.5 6.5 0 0 0 6.5 13c0 1.4.4 2.6 1 3.5V21"/><path d="M13.2 11.6c0-.9-.7-1.6-1.6-1.6-.6 0-1 .3-1.3.7-.3-.4-.7-.7-1.3-.7-.9 0-1.6.7-1.6 1.6 0 1.3 1.6 2.2 2.9 3.1 1.3-.9 2.9-1.8 2.9-3.1z"/></svg>',
  // Physiotherapy — active body / stretching figure
  physio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="2"/><path d="M12 6.5v6"/><path d="M6.5 9L12 10l5.5-1"/><path d="M12 12.5l-3.5 8"/><path d="M12 12.5l3.5 8"/></svg>',
  // Walk-in clinic — building with a medical cross
  walkin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V7l8-4 8 4v14"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="2" y1="21" x2="22" y2="21"/></svg>',
  // Laboratory — flask
  lab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><line x1="8" y1="15" x2="16" y2="15"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
};
function iconSvg(key) { return ICONS[key] || ""; }

// Circular score indicator (ring fills proportional to score/5)
function scoreRing(score, color) {
  if (score == null) return '<span class="ring-na">—</span>';
  const pct = (score / 5) * 100;
  return `<svg class="score-ring" viewBox="0 0 36 36">` +
    `<circle class="ring-bg" cx="18" cy="18" r="15.915"/>` +
    `<circle class="ring-fg" cx="18" cy="18" r="15.915" stroke="${color}" stroke-dasharray="${pct} 100"/>` +
    `<text class="ring-text" x="18" y="18" fill="${color}">${score}</text>` +
    `</svg>`;
}

const input = document.getElementById("addressInput");
const suggestionsEl = document.getElementById("suggestions");
const status = document.getElementById("status");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");

// ---------- Neighborhood map (Leaflet, zoomed to the patient's area) ----------
let nsMap, nsMarker, ceLayer;

function initMap() {
  if (nsMap || !document.getElementById("nsMap")) return;
  nsMap = L.map("nsMap", { zoomControl: true, scrollWheelZoom: false });
  // Clean, low-clutter street basemap (shows neighborhoods without heavy labels)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd", maxZoom: 19,
    attribution: "© OpenStreetMap · © CARTO",
  }).addTo(nsMap);
  nsMap.setView([44.9, -63.2], 7);   // Nova Scotia overview until a search
  setTimeout(() => nsMap.invalidateSize(), 100);
}

// Zoom to the patient's community and drop the red dot
function renderNsMap(lat, lng, ceGeometry) {
  if (!nsMap) initMap();
  if (!nsMap) return;

  // Subtle CE boundary for context
  if (ceLayer) { nsMap.removeLayer(ceLayer); ceLayer = null; }
  if (ceGeometry) {
    ceLayer = L.geoJSON(ceGeometry, {
      style: { color: "#1565a8", weight: 2, fillColor: "#2b87d1", fillOpacity: 0.10 },
    }).addTo(nsMap);
  }

  if (nsMarker) nsMap.removeLayer(nsMarker);
  nsMarker = L.circleMarker([lat, lng], {
    radius: 7, color: "#ffffff", weight: 2.5, fillColor: "#d14343", fillOpacity: 1,
  }).addTo(nsMap);

  // Auto-zoom to the neighborhood (level ~14); frame the CE if we have it
  if (ceLayer) {
    nsMap.fitBounds(ceLayer.getBounds(), { padding: [10, 10], maxZoom: 15 });
  } else {
    nsMap.setView([lat, lng], 14);
  }
  setTimeout(() => nsMap.invalidateSize(), 100);
}

// Draw the base map on load
initMap();

// Print / export — open the report options first
document.getElementById("printBtn").addEventListener("click", openPrintModal);

// Collapse / expand panels
document.querySelectorAll(".collapse-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById(btn.dataset.target).classList.toggle("collapsed");
  });
});

let debounceTimer = null;
let activeIndex = -1;
let currentItems = [];

// ---------- Autocomplete ----------
input.addEventListener("input", () => {
  const q = input.value.trim();
  clearTimeout(debounceTimer);

  if (q.length < 1) {
    hideSuggestions();
    return;
  }

  // Short debounce so the list feels instant while typing
  debounceTimer = setTimeout(() => fetchSuggestions(q), 140);
});

input.addEventListener("keydown", (e) => {
  if (suggestionsEl.classList.contains("hidden")) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveActive(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    moveActive(-1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (activeIndex >= 0) selectItem(currentItems[activeIndex]);
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

// Close the dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".autocomplete")) hideSuggestions();
});

async function fetchSuggestions(q) {
  try {
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error();
    const items = await res.json();
    renderSuggestions(items);
  } catch {
    // Surface a clear message instead of silently showing nothing
    currentItems = [];
    activeIndex = -1;
    suggestionsEl.innerHTML =
      '<li class="suggestion-empty">⚠ Address service unavailable — is the server running?</li>';
    suggestionsEl.classList.remove("hidden");
  }
}

function renderSuggestions(items) {
  currentItems = items;
  activeIndex = -1;
  suggestionsEl.innerHTML = "";

  if (!items.length) {
    suggestionsEl.innerHTML = '<li class="suggestion-empty">No matches found</li>';
    suggestionsEl.classList.remove("hidden");
    return;
  }

  items.forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "suggestion";
    li.innerHTML =
      `<span class="sug-dot"></span>` +
      `<span class="sug-text">` +
        `<span class="sug-address">${item.address}</span>` +
        `<span class="sug-community">${item.community}</span>` +
      `</span>`;
    li.addEventListener("click", () => selectItem(item));
    li.addEventListener("mouseenter", () => setActive(i));
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.remove("hidden");
}

function moveActive(delta) {
  const n = currentItems.length;
  if (!n) return;
  activeIndex = (activeIndex + delta + n) % n;
  setActive(activeIndex);
}

function setActive(i) {
  activeIndex = i;
  [...suggestionsEl.children].forEach((li, idx) =>
    li.classList.toggle("active", idx === i)
  );
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  activeIndex = -1;
}

// ---------- Selection -> profile lookup ----------
async function selectItem(item) {
  input.value = item.label;
  hideSuggestions();
  status.innerHTML = '<span class="spinner"></span> Loading community profile…';
  status.className = "status loading";

  try {
    const url = `/api/profile?lat=${item.lat}&lng=${item.lng}` +
      `&address=${encodeURIComponent(item.address)}` +
      `&community=${encodeURIComponent(item.community)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Could not resolve this address.");
    }
    const data = await res.json();
    renderResult(data);
    status.textContent = "";
    status.className = "status";
  } catch (err) {
    emptyState.classList.remove("hidden");
    resultContent.classList.add("hidden");
    status.textContent = "⚠ " + err.message;
    status.className = "status error";
  }
}

// ---------- Results ----------
function renderResult(data) {
  emptyState.classList.add("hidden");
  resultContent.classList.remove("hidden");
  // Re-trigger the fade-in animation on each new result
  resultContent.classList.remove("fade-in");
  void resultContent.offsetWidth;
  resultContent.classList.add("fade-in");

  document.getElementById("resAddress").textContent = data.address;
  document.querySelector(".loc-community").innerHTML =
    `<span class="loc-pin">${iconSvg("pin")}</span><span id="resCommunity">${data.community}</span>`;
  document.getElementById("resCeName").textContent = data.ce_name;
  renderCommunityInfo(data.community_info || []);

  currentPatient = { lat: data.lat, lng: data.lng, name: `${data.community} · ${data.address}` };
  resetServices();

  const categories = data.categories || [];
  // Guard each renderer so one failure doesn't blank the whole result
  try { renderNsMap(data.lat, data.lng, data.ce_geometry); } catch (e) { console.error("map:", e); }
  try { renderOverall(data.overall); } catch (e) { console.error("overall:", e); }
  try { renderBars(categories); } catch (e) { console.error("bars:", e); }
  try { renderCategories(categories); } catch (e) { console.error("categories:", e); }
  try { fillPrintSummary(data, categories); } catch (e) { console.error("print:", e); }
}

// Build the print-only report
function fillPrintSummary(data, categories) {
  // Patient line: DALHOUSIE · Halifax · 6281 Jennings St
  document.getElementById("psName").textContent =
    `${(data.ce_name || "").toUpperCase()} · ${data.community} · ${data.address}`;

  // Overall conclusion banner (dot + headline + sentence)
  const o = data.overall;
  const psOverall = document.getElementById("psOverall");
  psOverall.innerHTML = o
    ? `<div class="ps-banner" style="border-color:${o.color}">` +
        `<span class="ps-banner-dot" style="background:${o.color}"></span>` +
        `<div><div class="ps-banner-head" style="color:${o.color}">${o.headline}</div>` +
        `<div class="ps-banner-sub">${o.sentence}</div></div>` +
      `</div>`
    : "";

  // Category rows with progress bars + grade
  document.getElementById("psCats").innerHTML = categories
    .map((c) => {
      const pct = c.score != null
        ? (c.score / 5) * 100
        : ({ A: 88, B: 55, C: 28 }[c.grade] || 50);   // placeholder (Environment) from grade
      return (
        `<div class="ps-cat-row">` +
          `<span class="ps-cat-name">${c.name}</span>` +
          `<span class="ps-cat-bar"><span class="ps-cat-fill" style="width:${pct}%;background:${c.color}"></span></span>` +
          `<span class="ps-cat-grade" style="color:${c.color}">${c.grade || "–"}</span>` +
        `</div>`
      );
    })
    .join("");
}

// Big at-a-glance conclusion box (the 5-second read for the doctor)
function renderOverall(overall) {
  const el = document.getElementById("overallSummary");
  if (!overall) { el.innerHTML = ""; return; }
  el.style.borderColor = overall.color;
  el.style.background = withAlpha(overall.color, 0.08);
  el.innerHTML =
    `<span class="os-dot" style="background:${overall.color}"></span>` +
    `<div class="os-body">` +
      `<div class="os-headline" style="color:${overall.color}">${overall.headline}</div>` +
      `<div class="os-sentence">${overall.sentence}</div>` +
    `</div>`;
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Progress bars per scored category — fill by score, labelled qualitatively (no numbers)
function renderBars(categories) {
  const el = document.getElementById("scoreBars");
  const scored = categories.filter((c) => c.scored && c.score != null);
  el.innerHTML = scored
    .map((c) => {
      const pct = (c.score / 5) * 100;
      return (
        `<div class="bar-row">` +
          `<div class="bar-label"><span class="bar-icon" style="color:${c.color}">${iconSvg(c.icon)}</span>${c.name}</div>` +
          `<div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${c.color}"></div></div>` +
          `<div class="bar-grade" style="background:${c.color}">${c.grade}</div>` +
        `</div>`
      );
    })
    .join("");
}

function renderCommunityInfo(rows) {
  const el = document.getElementById("communityInfo");
  if (!rows.length) {
    el.innerHTML = '<p class="muted">No community indicators available.</p>';
    return;
  }
  el.innerHTML = rows
    .map((r) =>
      `<div class="ci-row">` +
        `<span class="ci-icon">${iconSvg(r.icon)}</span>` +
        `<span class="ci-label">${r.label}</span>` +
        `<span class="ci-value">${r.value}</span>` +
      `</div>`)
    .join("");
}

let currentCategories = [];

function renderCategories(categories) {
  currentCategories = categories;
  const container = document.getElementById("categories");
  container.innerHTML = "";

  if (!categories.length) {
    container.innerHTML = '<p class="muted">No indicators available for this CE.</p>';
    return;
  }

  categories.forEach((cat, i) => {
    const card = document.createElement("div");
    card.className = "cat-card";
    card.style.borderTopColor = cat.color;
    card.addEventListener("click", () => openModal(i));

    card.innerHTML =
      `<div class="cat-head">` +
        `<span class="cat-icon" style="color:${cat.color}">${iconSvg(cat.icon)}</span>` +
        `<span class="cat-grade" style="background:${cat.color}">${cat.grade}</span>` +
      `</div>` +
      `<div class="cat-name">${cat.name}</div>` +
      `<span class="cat-more">View details</span>`;
    container.appendChild(card);
  });
}

// ---------- Category detail modal ----------
const modal = document.getElementById("modal");

function openModal(index) {
  const cat = currentCategories[index];
  if (!cat) return;
  document.getElementById("modalTitle").textContent = cat.name;
  const sub = document.getElementById("modalSub");
  sub.textContent = "Grade " + (cat.grade || "–");
  const badge = document.getElementById("modalBadge");
  badge.innerHTML = iconSvg(cat.icon);
  badge.style.background = cat.color;
  sub.style.color = cat.color;

  modalIndicators = cat.indicators;
  document.getElementById("modalRows").innerHTML = cat.indicators
    .map((ind, i) => {
      const arrow = { above: "▲", below: "▼", near: "≈" }[ind.relative] || "";
      const rel = ind.relative || "na";
      return (
        `<div class="ind-row">` +
          `<span class="ind-label">${ind.label}` +
            `<button class="ind-info" data-idx="${i}" title="Details">${iconSvg("info")}</button>` +
          `</span>` +
          `<span class="ind-rel rel-${rel}" style="color:${ind.tone_color}">${arrow} ${ind.relative_label}</span>` +
        `</div>`
      );
    })
    .join("");

  modal.classList.remove("hidden");
}

function closeModal() { modal.classList.add("hidden"); closePopover(); }
document.getElementById("modalClose").addEventListener("click", closeModal);
modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closePopover(); closeModal(); } });

// ---------- Indicator detail popover ----------
let modalIndicators = [];
const popover = document.getElementById("indPopover");

document.getElementById("modalRows").addEventListener("click", (e) => {
  const btn = e.target.closest(".ind-info");
  if (!btn) return;
  e.stopPropagation();
  openPopover(modalIndicators[+btn.dataset.idx], btn);
});

function openPopover(ind, anchor) {
  if (!ind) return;
  document.getElementById("ipTitle").textContent = ind.label;
  document.getElementById("ipDef").textContent = ind.definition;
  document.getElementById("ipDot").style.background = ind.tone_color;
  const val = document.getElementById("ipVal");
  val.textContent = ind.value;
  val.style.color = ind.tone_color;
  document.getElementById("ipAvg").textContent = ind.ns_avg;

  popover.classList.remove("hidden");
  // Position under the icon, clamped to the viewport
  const r = anchor.getBoundingClientRect();
  const pw = popover.offsetWidth, ph = popover.offsetHeight;
  let left = Math.min(r.left, window.innerWidth - pw - 12);
  let top = r.bottom + 8;
  if (top + ph > window.innerHeight - 12) top = r.top - ph - 8;
  popover.style.left = Math.max(12, left) + "px";
  popover.style.top = Math.max(12, top) + "px";
}

function closePopover() { popover.classList.add("hidden"); }
document.addEventListener("click", (e) => {
  if (!popover.classList.contains("hidden") && !e.target.closest("#indPopover") && !e.target.closest(".ind-info")) {
    closePopover();
  }
});

// ---------- Phase 2: tabs + Social Prescribing ----------
let currentPatient = null;
let activeServiceCat = null;

// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".tab-pane").forEach((p) =>
      p.classList.toggle("hidden", p.id !== tab.dataset.tab)
    );
  });
});

// Service categories
const SERVICE_CATS = [
  { key: "pharmacy",      label: "Pharmacy",       icon: "pharmacy" },
  { key: "mental_health", label: "Mental Health",  icon: "mental" },
  { key: "physiotherapy", label: "Physiotherapy",  icon: "physio" },
  { key: "walkin",        label: "Walk-in Clinic", icon: "walkin" },
  { key: "laboratory",    label: "Laboratory",     icon: "lab" },
];

(function buildServiceButtons() {
  const el = document.getElementById("serviceCats");
  if (!el) return;
  el.innerHTML = SERVICE_CATS.map(
    (c) =>
      `<button class="svc-cat" data-cat="${c.key}">` +
        `<span class="svc-cat-icon">${iconSvg(c.icon)}</span>` +
        `<span class="svc-cat-label">${c.label}</span>` +
      `</button>`
  ).join("");
  el.querySelectorAll(".svc-cat").forEach((btn) => {
    btn.addEventListener("click", () => selectServiceCategory(btn.dataset.cat, btn));
  });
})();

function resetServices() {
  activeServiceCat = null;
  document.querySelectorAll(".svc-cat").forEach((b) => b.classList.remove("active"));
  const res = document.getElementById("serviceResults");
  if (res) res.innerHTML = "";
}

async function selectServiceCategory(cat, btn) {
  const res = document.getElementById("serviceResults");
  if (!currentPatient) {
    res.innerHTML = '<p class="svc-msg">Search a patient address first (Community Profile tab).</p>';
    return;
  }
  document.querySelectorAll(".svc-cat").forEach((b) => b.classList.toggle("active", b === btn));
  activeServiceCat = cat;

  res.innerHTML = '<p class="svc-msg"><span class="spinner"></span> Finding nearby services…</p>';
  try {
    const url = `/api/services?lat=${currentPatient.lat}&lng=${currentPatient.lng}&category=${cat}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const items = await r.json();
    renderServices(items);
  } catch {
    res.innerHTML = '<p class="svc-msg error">Could not load services right now. Please try again.</p>';
  }
}

function renderServices(items) {
  const res = document.getElementById("serviceResults");
  if (!items.length) {
    res.innerHTML = '<p class="svc-msg">No services found within 10 km.</p>';
    return;
  }
  const catIcon = (SERVICE_CATS.find((c) => c.key === activeServiceCat) || {}).icon;

  res.innerHTML = items
    .map((s) => {
      const meta = [`<span class="svc-dist">${s.distance_km} km away</span>`];
      if (s.phone) meta.push(`<span class="svc-tag">${iconSvg("phone")}${s.phone}</span>`);
      if (s.hours) meta.push(`<span class="svc-tag">${iconSvg("clock")}${s.hours}</span>`);

      return (
        `<div class="svc-item">` +
          `<span class="svc-icon">${iconSvg(catIcon)}</span>` +
          `<div class="svc-main">` +
            `<div class="svc-name">${s.name}</div>` +
            (s.address ? `<div class="svc-addr">${s.address}</div>` : "") +
            `<div class="svc-meta">${meta.join("")}</div>` +
            (s.website
              ? `<a class="svc-web" href="${s.website}" target="_blank" rel="noopener">${iconSvg("link")} Website</a>`
              : "") +
          `</div>` +
          `<a class="svc-map" href="${s.maps_url}" target="_blank" rel="noopener">${iconSvg("map")} Get directions</a>` +
        `</div>`
      );
    })
    .join("");
}

// ---------- Customizable print / export report ----------
const printModal = document.getElementById("printModal");

function openPrintModal() {
  const optsEl = document.getElementById("pmServiceOpts");
  const statusEl = document.getElementById("pmStatus");
  statusEl.textContent = "";
  statusEl.className = "pm-status";

  if (!currentPatient) {
    optsEl.innerHTML = "";
    statusEl.textContent = "Search a patient address first (Community Profile tab).";
    statusEl.className = "pm-status warn";
    document.getElementById("pmGenerate").disabled = true;
  } else {
    document.getElementById("pmGenerate").disabled = false;
    optsEl.innerHTML = SERVICE_CATS.map(
      (c) =>
        `<label class="pm-opt"><input type="checkbox" value="${c.key}" />` +
        `<span class="pm-opt-icon">${iconSvg(c.icon)}</span>${c.label}</label>`
    ).join("");
  }
  printModal.classList.remove("hidden");
}

function closePrintModal() { printModal.classList.add("hidden"); }
document.getElementById("printModalClose").addEventListener("click", closePrintModal);
document.getElementById("pmCancel").addEventListener("click", closePrintModal);
printModal.querySelector(".modal-backdrop").addEventListener("click", closePrintModal);

document.getElementById("pmGenerate").addEventListener("click", async () => {
  const chosen = [...document.querySelectorAll("#pmServiceOpts input:checked")].map((c) => c.value);
  const statusEl = document.getElementById("pmStatus");
  const psServices = document.getElementById("psServices");
  psServices.innerHTML = "";

  if (chosen.length) {
    statusEl.className = "pm-status";
    statusEl.innerHTML = '<span class="spinner"></span> Gathering nearby services…';
    try {
      const groups = await Promise.all(
        chosen.map(async (cat) => {
          const r = await fetch(`/api/services?lat=${currentPatient.lat}&lng=${currentPatient.lng}&category=${cat}`);
          const items = r.ok ? await r.json() : [];
          return { cat, items: Array.isArray(items) ? items.slice(0, 4) : [] };
        })
      );
      psServices.innerHTML = buildPrintServices(groups);
    } catch {
      statusEl.textContent = "Could not load some services — printing the profile only.";
    }
  }

  statusEl.textContent = "";
  closePrintModal();
  setTimeout(() => window.print(), 150);
});

function buildPrintServices(groups) {
  const catLabel = (k) => (SERVICE_CATS.find((c) => c.key === k) || {}).label || k;
  let html = "";
  for (const g of groups) {
    if (!g.items.length) continue;
    html += `<hr class="ps-hr" /><div class="ps-section">RECOMMENDED SERVICES — ${catLabel(g.cat)}</div>`;
    html += '<div class="ps-svc-group">';
    g.items.forEach((s, i) => {
      html +=
        `<div class="ps-svc-item">` +
          `<span class="ps-svc-num">${i + 1}</span>` +
          `<div class="ps-svc-body">` +
            `<span class="ps-svc-name">${s.name}</span>` +
            (s.address ? `<span class="ps-svc-addr">${s.address}</span>` : "") +
          `</div>` +
          `<span class="ps-svc-dist">${s.distance_km} km</span>` +
          (s.phone ? `<span class="ps-svc-phone">${iconSvg("phone")}${s.phone}</span>` : "") +
        `</div>`;
    });
    html += "</div>";
  }
  return html;
}
