// Professional line icons per category (inherit currentColor)
const ICONS = {
  income: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  diversity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  environment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>',
  transit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  // Community-at-a-glance + location icons
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  medical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
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
  document.getElementById("resCeId").textContent = "CE " + data.ce_id;
  renderCommunityInfo(data.community_info || []);

  const categories = data.categories || [];
  // Guard each renderer so one failure doesn't blank the whole result
  try { renderBars(categories, data); } catch (e) { console.error("bars:", e); }
  try { renderCategories(categories); } catch (e) { console.error("categories:", e); }
  try { fillPrintSummary(data, categories); } catch (e) { console.error("print:", e); }
}

// Build the print-only summary sheet
function fillPrintSummary(data, categories) {
  document.getElementById("psCeName").textContent = data.ce_name;
  document.getElementById("psCeId").textContent = "CE " + data.ce_id;
  document.getElementById("psLoc").textContent = `${data.community} · ${data.address}`;
  const pop = (data.community_info.find((r) => r.label === "Population") || {}).value || data.population || "—";
  document.getElementById("psPop").textContent = `Population: ${pop}  |  Census: 2021`;

  document.getElementById("psCats").innerHTML = categories
    .map((c) => {
      const score = c.score == null ? "—" : c.score;
      return `<div class="ps-cat-row">` +
        `<span class="ps-cat-name">${c.name}</span>` +
        `<span class="ps-cat-score" style="color:${c.color}">${score}</span>` +
        `<span class="ps-cat-status" style="color:${c.color}">${c.status_label || c.level_label}</span>` +
        `</div>`;
    })
    .join("");

  document.getElementById("psFoot").textContent =
    "Scores 1–5 relative to the Nova Scotia average · Apr 2025";
}

// Horizontal colored score bars (replaces the spider chart) for scored categories
function renderBars(categories, data) {
  const el = document.getElementById("scoreBars");
  const scored = categories.filter((c) => c.scored && c.score != null);
  const pop = (data.community_info.find((r) => r.label === "Population") || {}).value || "—";
  const tip = `Population: ${pop} · Census 2021`;

  el.innerHTML = scored
    .map((c) => {
      const pct = (c.score / 5) * 100;
      return (
        `<div class="bar-row" title="${c.name}: ${c.score}/5 · ${tip}">` +
          `<div class="bar-label"><span class="bar-icon">${iconSvg(c.icon)}</span>${c.name}</div>` +
          `<div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${c.color}"></div></div>` +
          `<div class="bar-score" style="color:${c.color}">${c.score}</div>` +
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
        scoreRing(cat.score, cat.color) +
      `</div>` +
      `<div class="cat-name">${cat.name}</div>` +
      `<div class="cat-status" style="color:${cat.color}">${cat.status_label || cat.level_label}</div>` +
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
  document.getElementById("modalSub").textContent = cat.status_label || cat.level_label;
  const badge = document.getElementById("modalBadge");
  badge.textContent = cat.score == null ? "—" : cat.score;
  badge.style.background = cat.color;
  document.getElementById("modalSub").style.color = cat.color;

  document.getElementById("modalRows").innerHTML = cat.indicators
    .map((ind) => `<div class="ind-row"><span class="ind-label">${ind.label}</span><span class="ind-value">${ind.value}</span></div>`)
    .join("");

  modal.classList.remove("hidden");
}

function closeModal() { modal.classList.add("hidden"); }
document.getElementById("modalClose").addEventListener("click", closeModal);
modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
