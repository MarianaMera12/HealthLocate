let nsMap, nsMarker, radarChart, nsOutlineGeo, nsOutlineLayer, ceLayer;

// Preload the Nova Scotia outline and draw the silhouette immediately
fetch("/api/ns-outline")
  .then((r) => r.json())
  .then((gj) => { nsOutlineGeo = gj; initNsMap(); })
  .catch(() => {});

// Build the static silhouette map on load (dot is added once an address is picked)
function initNsMap() {
  if (nsMap || !document.getElementById("nsMap")) return;
  nsMap = L.map("nsMap", {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
  });
  // Land silhouette over an ocean-colored background
  nsOutlineLayer = L.geoJSON(nsOutlineGeo, {
    style: { color: "#9cc3e0", weight: 1, fillColor: "#f6fafd", fillOpacity: 1 },
  }).addTo(nsMap);
  nsMap.fitBounds(nsOutlineLayer.getBounds(), { padding: [6, 6] });
  setTimeout(() => nsMap.invalidateSize(), 100);
}

const input = document.getElementById("addressInput");
const suggestionsEl = document.getElementById("suggestions");
const status = document.getElementById("status");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");

// Print / export the current profile
document.getElementById("printBtn").addEventListener("click", () => {
  // Capture the fully-rendered chart as an image for the print sheet
  if (radarChart) {
    document.getElementById("psChart").src = radarChart.toBase64Image();
  }
  window.print();
});

// Collapse / expand panels
document.querySelectorAll(".collapse-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = document.getElementById(btn.dataset.target);
    panel.classList.toggle("collapsed");
    // Let the layout settle, then resize map / chart
    setTimeout(() => {
      if (nsMap) nsMap.invalidateSize();
      if (radarChart) radarChart.resize();
    }, 320);
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
  document.getElementById("resCommunity").textContent = data.community;
  document.getElementById("resCeName").textContent = data.ce_name;
  document.getElementById("resCeId").textContent = "CE " + data.ce_id;
  renderCommunityInfo(data.community_info || []);

  const categories = data.categories || [];
  // Guard each renderer so one failure doesn't blank the whole result
  try { renderRadar(categories); } catch (e) { console.error("radar:", e); }
  try { renderCategories(categories); } catch (e) { console.error("categories:", e); }
  try { renderNsMap(data.lat, data.lng, data.ce_geometry); } catch (e) { console.error("map:", e); }
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

// Add transparency to a hex color
function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Spider (radar) chart: 4 category scores on a 1-5 web
function renderRadar(categories) {
  const labels = categories.map((c) => c.name);
  const scores = categories.map((c) => c.score ?? 0);
  const colors = categories.map((c) => c.color);

  if (radarChart) radarChart.destroy();

  radarChart = new Chart(document.getElementById("radarChart"), {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label: "Community score",
        data: scores,
        fill: true,
        backgroundColor: "rgba(21, 101, 168, 0.16)",
        borderColor: "#1565a8",
        borderWidth: 2,
        pointBackgroundColor: colors,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => `Score: ${categories[ctx.dataIndex].score} / 5` },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, backdropColor: "transparent", color: "#6b7e91" },
          grid: { color: "#e2e9f0" },
          angleLines: { color: "#e2e9f0" },
          pointLabels: { font: { size: 13, weight: "600" }, color: "#1a2b3c" },
        },
      },
    },
  });
}

function renderCommunityInfo(rows) {
  const el = document.getElementById("communityInfo");
  if (!rows.length) {
    el.innerHTML = '<p class="muted">No community indicators available.</p>';
    return;
  }
  el.innerHTML = rows
    .map((r) => `<div class="ci-row"><span class="ci-label">${r.label}</span><span class="ci-value">${r.value}</span></div>`)
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

    const scoreText = cat.score == null ? "—" : cat.score;
    card.innerHTML =
      `<div class="cat-head">` +
        `<span class="cat-name">${cat.name}</span>` +
        `<span class="cat-score" style="background:${cat.color}">${scoreText}</span>` +
      `</div>` +
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

// Small province-view map: Nova Scotia silhouette + a location dot
function renderNsMap(lat, lng, ceGeometry) {
  if (!nsMap) initNsMap();
  if (!nsMap) return;

  if (nsMarker) nsMap.removeLayer(nsMarker);
  nsMarker = L.circleMarker([lat, lng], {
    radius: 6,
    color: "#ffffff",
    weight: 2,
    fillColor: "#d14343",
    fillOpacity: 1,
  }).addTo(nsMap);

  // Keep the whole province in view (compact locator)
  if (nsOutlineLayer) {
    nsMap.fitBounds(nsOutlineLayer.getBounds(), { padding: [6, 6] });
  }
  setTimeout(() => nsMap.invalidateSize(), 100);
}
