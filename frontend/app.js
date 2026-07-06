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
document.getElementById("printBtn").addEventListener("click", () => window.print());

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
  document.getElementById("resPop").textContent = data.population || "—";

  const categories = data.categories || [];
  // Guard each renderer so one failure doesn't blank the whole result
  try { renderRadar(categories); } catch (e) { console.error("radar:", e); }
  try { renderCategories(categories); } catch (e) { console.error("categories:", e); }
  try { renderNsMap(data.lat, data.lng, data.ce_geometry); } catch (e) { console.error("map:", e); }
}

// Add transparency to a hex color
function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Polar area (rose) chart: one colored petal per category, radius = score
function renderRadar(categories) {
  const labels = categories.map((c) => c.name);
  const scores = categories.map((c) => c.score ?? 0);
  const colors = categories.map((c) => c.color);

  if (radarChart) radarChart.destroy();

  radarChart = new Chart(document.getElementById("radarChart"), {
    type: "polarArea",
    data: {
      labels,
      datasets: [{
        data: scores,
        backgroundColor: colors.map((c) => withAlpha(c, 0.75)),
        borderColor: "#ffffff",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { size: 12 }, color: "#1a2b3c", padding: 14, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const cat = categories[ctx.dataIndex];
              return cat.pending ? "Data pending (Can-ALE)" : `Score: ${cat.score} / 5`;
            },
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 5,
          ticks: { stepSize: 1, backdropColor: "transparent", color: "#6b7e91" },
          grid: { color: "#e2e9f0" },
          angleLines: { color: "#e2e9f0" },
        },
      },
    },
  });
}

function renderCategories(categories) {
  const container = document.getElementById("categories");
  container.innerHTML = "";

  if (!categories.length) {
    container.innerHTML = '<p class="muted">No indicators available for this CE.</p>';
    return;
  }

  for (const cat of categories) {
    const card = document.createElement("div");
    card.className = "flip-card" + (cat.pending ? " pending" : "");
    // Tap to flip (for touch devices; hover handles desktop)
    card.addEventListener("click", () => card.classList.toggle("flipped"));

    const scoreText = cat.score == null ? "—" : cat.score;

    let rows = "";
    for (const ind of cat.indicators) {
      rows += `<div class="ind-row"><span class="ind-label">${ind.label}</span><span class="ind-value">${ind.value}</span></div>`;
    }

    card.innerHTML =
      `<div class="flip-inner">` +
        `<div class="flip-front" style="background:${cat.color}">` +
          `<span class="fc-name">${cat.name}</span>` +
          `<div><div class="fc-score">${scoreText}</div>` +
          `<div class="fc-level">${cat.status_label || cat.level_label}</div></div>` +
          `<span class="fc-hint">Hover for details</span>` +
        `</div>` +
        `<div class="flip-back">` +
          `<div class="fb-title" style="color:${cat.color}">${cat.name}</div>` +
          `<div class="fb-rows">${rows}</div>` +
        `</div>` +
      `</div>`;
    container.appendChild(card);
  }
}

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
