let map, marker;

const form = document.getElementById("searchForm");
const status = document.getElementById("status");
const btn = document.getElementById("searchBtn");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const civic = document.getElementById("civic").value.trim();
  const street = document.getElementById("street").value.trim();
  if (!civic || !street) return;

  setLoading(true);
  status.textContent = "Buscando dirección...";
  status.className = "status loading";

  try {
    const url = `/api/search?civic=${encodeURIComponent(civic)}&street=${encodeURIComponent(street)}`;
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "No se encontró la dirección.");
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
  } finally {
    setLoading(false);
  }
});

function setLoading(loading) {
  btn.disabled = loading;
  btn.querySelector(".btn-text").textContent = loading ? "Buscando..." : "Buscar";
}

function renderResult(data) {
  emptyState.classList.add("hidden");
  resultContent.classList.remove("hidden");

  document.getElementById("resAddress").textContent = data.address;
  document.getElementById("resCommunity").textContent = data.community;
  document.getElementById("resCeName").textContent = data.ce_name;
  document.getElementById("resCeId").textContent = "ID: " + data.ce_id;

  renderIndicators(data.indicators);
  renderMap(data.lat, data.lng, data.address);
}

function renderIndicators(indicators) {
  const container = document.getElementById("indicators");
  container.innerHTML = "";

  if (!indicators || indicators.length === 0) {
    container.innerHTML = '<p class="muted">No hay indicadores disponibles para esta CE.</p>';
    return;
  }

  // Agrupar por categoría conservando el orden
  const groups = {};
  const order = [];
  for (const ind of indicators) {
    if (!groups[ind.group]) {
      groups[ind.group] = [];
      order.push(ind.group);
    }
    groups[ind.group].push(ind);
  }

  for (const group of order) {
    const title = document.createElement("div");
    title.className = "ind-group-title";
    title.textContent = group;
    container.appendChild(title);

    for (const ind of groups[group]) {
      const row = document.createElement("div");
      row.className = "ind-row";
      row.innerHTML = `<span class="ind-label">${ind.label}</span><span class="ind-value">${ind.value}</span>`;
      container.appendChild(row);
    }
  }
}

function renderMap(lat, lng, label) {
  if (!map) {
    map = L.map("map").setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
  } else {
    map.setView([lat, lng], 15);
  }

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lng]).addTo(map).bindPopup(label).openPopup();

  // Leaflet necesita recalcular tamaño cuando el contenedor estaba oculto
  setTimeout(() => map.invalidateSize(), 100);
}
