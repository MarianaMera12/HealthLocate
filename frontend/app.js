let map, marker, radarChart;

const input = document.getElementById("addressInput");
const suggestionsEl = document.getElementById("suggestions");
const status = document.getElementById("status");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");

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
      `<span class="sug-icon">📍</span>` +
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
  status.textContent = "Loading community profile...";
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

  document.getElementById("resAddress").textContent = data.address;
  document.getElementById("resCommunity").textContent = data.community;
  document.getElementById("resCeName").textContent = data.ce_name;
  document.getElementById("resCeId").textContent = "ID: " + data.ce_id;

  const categories = data.categories || [];
  renderRadar(categories);
  renderCategories(categories);
  renderMap(data.lat, data.lng, data.address);
}

// Color for a 1-5 level (green = low, amber = mid, red = high)
function levelColor(level) {
  return {
    1: "#1f9d57", 2: "#7cb342", 3: "#d98a00", 4: "#e8743b", 5: "#d14343",
  }[level] || "#6b7e91";
}

function renderRadar(categories) {
  const labels = categories.map((c) => c.name);
  const scores = categories.map((c) => c.score ?? 0);

  if (radarChart) radarChart.destroy();

  radarChart = new Chart(document.getElementById("radarChart"), {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label: "Community score",
        data: scores,
        fill: true,
        backgroundColor: "rgba(21, 101, 168, 0.18)",
        borderColor: "#1565a8",
        borderWidth: 2,
        pointBackgroundColor: "#1565a8",
        pointBorderColor: "#fff",
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: { stepSize: 1, backdropColor: "transparent", color: "#6b7e91" },
          grid: { color: "#e2e9f0" },
          angleLines: { color: "#e2e9f0" },
          pointLabels: { font: { size: 12, weight: "600" }, color: "#1a2b3c" },
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
    card.className = "cat-card";

    const color = levelColor(cat.level);
    const scoreText = cat.score == null ? "—" : cat.score;

    let rows = "";
    for (const ind of cat.indicators) {
      rows += `<div class="ind-row"><span class="ind-label">${ind.label}</span><span class="ind-value">${ind.value}</span></div>`;
    }

    card.innerHTML =
      `<div class="cat-head">` +
        `<span class="cat-name">${cat.name}</span>` +
        `<span class="cat-score" style="background:${color}">${scoreText}</span>` +
      `</div>` +
      `<div class="cat-level" style="color:${color}">${cat.level_label}</div>` +
      `<div class="cat-indicators">${rows}</div>`;
    container.appendChild(card);
  }
}

function renderMap(lat, lng, label) {
  if (!map) {
    map = L.map("map", { zoomControl: true, scrollWheelZoom: true }).setView([lat, lng], 15);

    // Modern, clean basemap (CartoDB Voyager)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap · © CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);
  } else {
    map.setView([lat, lng], 15);
  }

  if (marker) map.removeLayer(marker);

  // Styled circular marker instead of the default pin
  marker = L.circleMarker([lat, lng], {
    radius: 10,
    color: "#ffffff",
    weight: 3,
    fillColor: "#1565a8",
    fillOpacity: 1,
  })
    .addTo(map)
    .bindPopup(label)
    .openPopup();

  // Leaflet needs to recalculate size when the container was hidden
  setTimeout(() => map.invalidateSize(), 100);
}
