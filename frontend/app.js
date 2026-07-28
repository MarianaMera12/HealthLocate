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

// Print / export the current profile
document.getElementById("printBtn").addEventListener("click", () => window.print());

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

  const categories = data.categories || [];
  // Guard each renderer so one failure doesn't blank the whole result
  try { renderNsMap(data.lat, data.lng, data.ce_geometry); } catch (e) { console.error("map:", e); }
  try { renderOverall(data.overall); } catch (e) { console.error("overall:", e); }
  try { renderBars(categories); } catch (e) { console.error("bars:", e); }
  try { renderCategories(categories); } catch (e) { console.error("categories:", e); }
  try { fillPrintSummary(data, categories); } catch (e) { console.error("print:", e); }
}

// Build the print-only summary sheet
function fillPrintSummary(data, categories) {
  document.getElementById("psCeName").textContent = data.ce_name;
  document.getElementById("psLoc").textContent = `${data.community} · ${data.address}`;
  const pop = (data.community_info.find((r) => r.label === "Population") || {}).value || data.population || "—";
  document.getElementById("psPop").textContent = `Population: ${pop}  |  Census: 2021`;

  // Overall conclusion at the top of the print
  const o = data.overall;
  const psOverall = document.getElementById("psOverall");
  if (psOverall) {
    psOverall.innerHTML = o
      ? `<div class="ps-overall" style="color:${o.color}">${o.headline}</div><div class="ps-overall-sub">${o.sentence}</div>`
      : "";
  }

  document.getElementById("psCats").innerHTML = categories
    .map((c) =>
      `<div class="ps-cat-row">` +
        `<span class="ps-cat-name">${c.name}</span>` +
        `<span class="ps-cat-status" style="color:${c.color}">Grade ${c.grade || "–"}</span>` +
      `</div>`)
    .join("");

  document.getElementById("psFoot").textContent =
    "Grades: A better than · B around · C below the Nova Scotia average · Apr 2025";
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
