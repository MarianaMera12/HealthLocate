# -*- coding: utf-8 -*-
"""
HealthLocate — Backend API (FastAPI)
Address autocomplete via the NS Open Data SODA API, then a local geopandas
spatial join: point -> Community Environ -> Health Atlas indicators.
"""
import re
from pathlib import Path

import pandas as pd
import geopandas as gpd
import requests
import shapely
from shapely.geometry import Point

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent
SHAPEFILE = BASE_DIR / "shapefiles" / "ComEnviron.shp"
ATLAS_CSV = BASE_DIR / "data" / "NSHealthAtlasDataEnvirons.csv"
# Community-level Active Living Environment data (provided by Saeed, Jul 8 2026).
# Already aggregated per CE; "ALE_index_class" is a 1-5 scale.
ALE_CSV = BASE_DIR / "data" / "ale_community_level.csv"
# NS Civic Addresses — SODA JSON endpoint (queried on demand)
SODA_URL = "https://data.novascotia.ca/resource/tntn-er5g.json"

# Indicator shortlist (Task 3) -> readable label + group
# Category definitions for the radar chart + per-category breakdown.
# Each category has a 1-5 "score" (official quintile, or computed for Environment)
# plus a list of (field, label, format) sub-indicators.
CATEGORIES = [
    {
        "name": "Income & Economic",
        "icon": "income",
        "scored": True,
        "score_from": "msi-score2021",
        "indicators": [
            ("msi-score2021",       "Overall score (quintile 1-5)", "{:.0f}"),
            ("msi-unemploymentrate", "Unemployment rate",           "{:.1%}"),
            ("msi-incomeavginc",    "Average income",               "${:,.0f}"),
            ("msi-incomegt30house", "Spending >30% on housing",     "{:.1%}"),
            ("msi-educationlow",    "Low education",                "{:.1%}"),
        ],
    },
    {
        "name": "Social Vulnerability",
        "icon": "social",
        "scored": True,
        "score_from": "scs-score2021",
        "indicators": [
            ("scs-score2021",  "Overall score (quintile 1-5)",       "{:.0f}"),
            ("scs-alone",      "Living alone",                       "{:.1%}"),
            ("scs-loneparent", "Lone-parent families",               "{:.1%}"),
            ("scs-sdw",        "Separated, divorced, or widowed",    "{:.1%}"),
        ],
    },
    {
        "name": "Community Diversity",
        "icon": "diversity",
        "scored": True,
        "score_from": "sds-score2021",
        "indicators": [
            ("sds-score2021",       "Overall score (quintile 1-5)",     "{:.0f}"),
            ("sds-recentimmigrant", "Recent immigrants",                "{:.1%}"),
            ("sds-offlanghome",     "Non-official language at home",    "{:.1%}"),
            ("sds-moved1yr",        "Moved within the last year",       "{:.1%}"),
        ],
    },
    {
        "name": "Transit / Active Living",
        "icon": "transit",
        "scored": True,
        "score_from": "ale",  # community-level ALE data from Saeed
        "indicators": [
            ("_ale_index",   "Active Living index (1-5)", "{:.2f}"),
            ("_ale_transit", "Transit index (1-5)",       "{:.2f}"),
        ],
    },
    {
        # Environment has no official composite yet (Saeed is computing the EQI).
        # Show the individual indicators instead of a single 1-5 number.
        "name": "Environment",
        "icon": "environment",
        "scored": False,
        "score_from": None,
        "indicators": [
            ("green-pwndvi", "Greenness (NDVI)",           "{:.2f}"),
            ("aq-meanpm25",  "Air — PM2.5 (μg/m³)",        "{:.2f}"),
            ("aq-meanno2",   "Air — NO₂",                  "{:.2f}"),
            ("well-arsenic", "Water — arsenic (% wells)",  "{:.1%}"),
            ("well-uranium", "Water — uranium (% wells)",  "{:.1%}"),
        ],
    },
]

# Environment currently has no composite score — the EQI is still being computed.
# Its individual indicators (greenness, air, water) are shown instead.


def load_data():
    print("Loading Community Environs shapefile...")
    gdf = gpd.read_file(SHAPEFILE)

    print("Loading Health Atlas indicators...")
    atlas = pd.read_csv(ATLAS_CSV)
    atlas = atlas[atlas["region"] == "community-environs"].copy()
    atlas["id"] = atlas["id"].astype(int)

    # Merge the community-level ALE data (Transit / Active Living)
    if ALE_CSV.exists():
        ale = pd.read_csv(ALE_CSV).dropna(subset=["id_community"])
        ale["id"] = ale["id_community"].astype(int)
        ale = ale.rename(columns={
            "ALE_index_class": "_ale_index",
            "ALE_transit_index_class": "_ale_transit",
        })
        atlas = atlas.merge(ale[["id", "_ale_index", "_ale_transit"]], on="id", how="left")
        print("ALE (Transit / Active Living) data merged.")
    else:
        print("ALE file not found — Transit will show as pending.")


    print("Data loaded. Addresses are fetched on demand from the SODA API.")
    return gdf, atlas


def compute_ns_outline(gdf, min_area=0.001):
    """Dissolve all CE polygons into the Nova Scotia silhouette (GeoJSON, WGS84).

    Tiny islands are dropped (area < `min_area` deg²) to keep a clean, light
    outline: mainland + Cape Breton + a few sizeable islands.
    """
    g = gdf.to_crs(4326)
    try:
        geom = g.geometry.union_all()
    except AttributeError:  # older geopandas/shapely
        geom = g.geometry.unary_union

    parts = list(getattr(geom, "geoms", [geom]))
    kept = [p for p in parts if p.area >= min_area]
    geom = shapely.geometry.MultiPolygon(kept) if len(kept) > 1 else kept[0]
    geom = geom.simplify(0.004, preserve_topology=True)
    return shapely.geometry.mapping(geom)


app = FastAPI(title="HealthLocate API")

# Loaded once at startup (addresses are no longer bulk-downloaded)
GDF, ATLAS = load_data()
NS_OUTLINE = compute_ns_outline(GDF)


LEVEL_LABELS = {
    1: "Well below NS average",
    2: "Below NS average",
    3: "Around NS average",
    4: "Above NS average",
    5: "Well above NS average",
}


def _fmt(fmt: str, val) -> str:
    """Format a value, returning an em dash for missing data."""
    if pd.isna(val):
        return "—"
    try:
        return fmt.format(val)
    except (ValueError, TypeError):
        return str(val)


# Score-based status: 1-2 favorable, 3 moderate, 4-5 needs attention
STATUS_COLORS = {
    "favorable": "#1f9d57",   # green
    "moderate":  "#d98a00",   # orange
    "attention": "#d14343",   # red
    "pending":   "#5b6b7b",   # data not yet available
}
STATUS_LABELS = {
    "favorable": "Favorable",
    "moderate":  "Moderate",
    "attention": "Needs attention",
    "pending":   "Data pending",
}


def _status(level):
    """Map a 1-5 level to a status key. Higher score = better (favorable)."""
    if level is None:
        return "pending"
    if level >= 4:
        return "favorable"      # 4-5 good
    if level == 3:
        return "moderate"       # 3 moderate
    return "attention"          # 1-2 needs attention


def _soql_safe(text: str) -> str:
    """Strip characters that could break out of a SoQL string literal."""
    return re.sub(r"['\"\\;]", "", text).strip()


def _civic_prefix_condition(digits: str, maxlen: int = 6) -> str:
    """Build a SoQL condition matching civic NUMBERS that start with `digits`.

    `civicnum` is a numeric column, so LIKE/starts_with don't work. We emulate
    prefix matching with numeric ranges: "6" -> 6, 60-69, 600-699, 6000-6999...
    """
    n = len(digits)
    base = int(digits)
    parts = []
    for length in range(n, maxlen + 1):
        factor = 10 ** (length - n)
        low = base * factor
        high = low + factor - 1
        if low == high:
            parts.append(f"civicnum={low}")
        else:
            parts.append(f"civicnum between {low} and {high}")
    return "(" + " OR ".join(parts) + ")"


@app.get("/api/suggest")
def suggest(q: str):
    """Address autocomplete backed by the NS Open Data SODA API.

    Accepts a free-text query like '5303 Mor' (civic number + street prefix)
    or just a street prefix like 'Morris'. Returns up to 10 suggestions,
    each carrying the coordinates needed for the CE lookup.
    """
    q = _soql_safe(q)
    if len(q) < 1:
        return []

    # Split a leading civic number from the street part.
    # Civic numbers are matched by PREFIX so typing "6" surfaces 6281, 6960, ...
    m = re.match(r"^(\d+)\s*(.*)$", q)
    where = []
    if m:
        civic, rest = m.group(1), m.group(2).strip()
        where.append(_civic_prefix_condition(civic))
        if rest:
            where.append(f"upper(strname) like '{rest.upper()}%'")
        order = "civicnum,strname"  # number-led query: sort by civic number first
    else:
        where.append(f"upper(strname) like '{q.upper()}%'")
        order = "strname,civicnum"

    params = {
        "$select": "civicnum,strname,strsuffix,comm,lat,long",
        "$where": " AND ".join(where),
        "$order": order,
        "$limit": "10",
    }

    try:
        rows = requests.get(SODA_URL, params=params, timeout=15).json()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Address service unavailable.")

    suggestions = []
    for r in rows:
        try:
            lat, lng = float(r["lat"]), float(r["long"])
        except (KeyError, TypeError, ValueError):
            continue
        suffix = r.get("strsuffix", "") or ""
        street = " ".join(p for p in [r.get("strname", ""), suffix] if p).strip()
        label = f"{r.get('civicnum', '')} {street}, {r.get('comm', '')}".strip()
        suggestions.append({
            "label": label,
            "address": f"{r.get('civicnum', '')} {street}".strip(),
            "community": r.get("comm", ""),
            "lat": lat,
            "lng": lng,
        })
    return suggestions


@app.get("/api/profile")
def profile(lat: float, lng: float, address: str = "", community: str = ""):
    """Resolve a coordinate to its Community Environ + Health Atlas indicators."""
    point = gpd.GeoDataFrame([{"geometry": Point(lng, lat)}], crs="EPSG:4326")
    point = point.to_crs(GDF.crs)
    ce = gpd.sjoin(point, GDF, how="left", predicate="within").iloc[0]

    if pd.isna(ce["id"]):
        raise HTTPException(status_code=404, detail="No Community Environ for this point.")

    ce_id = int(ce["id"])
    ce_name = str(ce["name"]).title()

    atlas_row = ATLAS[ATLAS["id"] == ce_id]
    categories = []
    if not atlas_row.empty:
        a = atlas_row.iloc[0]
        for cat in CATEGORIES:
            indicators = [
                {"label": label, "value": _fmt(fmt, a.get(field))}
                for field, label, fmt in cat["indicators"]
            ]

            if not cat.get("scored", True):
                # No composite score yet (e.g. Environment EQI is pending)
                categories.append({
                    "name": cat["name"],
                    "icon": cat["icon"],
                    "scored": False,
                    "color": STATUS_COLORS["pending"],
                    "status": "pending",
                    "status_label": "Indicators only",
                    "score": None,
                    "indicators": indicators,
                })
                continue

            sf = cat["score_from"]
            raw_score = a.get("_ale_index") if sf == "ale" else a.get(sf)
            score = None if pd.isna(raw_score) else round(float(raw_score), 1)
            level = None if score is None else max(1, min(5, int(round(score))))
            status = _status(level)

            categories.append({
                "name": cat["name"],
                "icon": cat["icon"],
                "scored": True,
                "color": STATUS_COLORS[status],          # semantic color by score
                "status": status,
                "status_label": STATUS_LABELS[status],
                "score": score,
                "level": level,
                "indicators": indicators,
            })

    population = "—"
    community_info = []
    if not atlas_row.empty:
        a = atlas_row.iloc[0]
        population = _fmt("{:,.0f}", a.get("pop_total_all"))
        community_info = [
            {"icon": "users",    "label": "Population",    "value": population},
            {"icon": "calendar", "label": "Census",        "value": "2021"},
            {"icon": "person",   "label": "Median age",    "value": _fmt("{:.0f} years", a.get("medage_total"))},
            {"icon": "medical",  "label": "No family MD",  "value": _fmt("{:.1%}", a.get("foc-nhs"))},
            {"icon": "income",   "label": "Median income", "value": _fmt("${:,.0f}", a.get("foc-medinc"))},
            {"icon": "home",     "label": "Renters",       "value": _fmt("{:.1%}", a.get("foc-renters"))},
        ]

    # CE polygon (simplified, WGS84) so the map can highlight the community
    ce_geom = None
    ce_row = GDF[GDF["id"] == ce_id]
    if not ce_row.empty:
        g = ce_row.to_crs(4326).geometry.iloc[0].simplify(0.0008, preserve_topology=True)
        ce_geom = shapely.geometry.mapping(g)

    return {
        "address": address,
        "community": community,
        "lat": lat,
        "lng": lng,
        "ce_id": ce_id,
        "ce_name": ce_name,
        "population": population,
        "community_info": community_info,
        "ce_geometry": ce_geom,
        "categories": categories,
    }


@app.get("/api/ns-outline")
def ns_outline():
    """Nova Scotia silhouette as GeoJSON (for the small locator map)."""
    return NS_OUTLINE


# Serves the frontend (index.html, style.css, app.js) from the root.
# Mounted last: /api/* routes take priority because they are defined first.
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")
