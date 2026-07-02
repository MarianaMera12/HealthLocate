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
from shapely.geometry import Point

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent
SHAPEFILE = BASE_DIR / "shapefiles" / "ComEnviron.shp"
ATLAS_CSV = BASE_DIR / "data" / "NSHealthAtlasDataEnvirons.csv"
# NS Civic Addresses — SODA JSON endpoint (queried on demand)
SODA_URL = "https://data.novascotia.ca/resource/tntn-er5g.json"

# Indicator shortlist (Task 3) -> readable label + group
# Category definitions for the radar chart + per-category breakdown.
# Each category has a 1-5 "score" (official quintile, or computed for Environment)
# plus a list of (field, label, format) sub-indicators.
CATEGORIES = [
    {
        "name": "Income & Economic",
        "score_field": "msi-score2021",
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
        "score_field": "scs-score2021",
        "indicators": [
            ("scs-score2021",  "Overall score (quintile 1-5)",       "{:.0f}"),
            ("scs-alone",      "Living alone",                       "{:.1%}"),
            ("scs-loneparent", "Lone-parent families",               "{:.1%}"),
            ("scs-sdw",        "Separated, divorced, or widowed",    "{:.1%}"),
        ],
    },
    {
        "name": "Community Diversity",
        "score_field": "sds-score2021",
        "indicators": [
            ("sds-score2021",       "Overall score (quintile 1-5)",     "{:.0f}"),
            ("sds-recentimmigrant", "Recent immigrants",                "{:.1%}"),
            ("sds-offlanghome",     "Non-official language at home",    "{:.1%}"),
            ("sds-moved1yr",        "Moved within the last year",       "{:.1%}"),
        ],
    },
    {
        "name": "Environment",
        "score_field": None,  # no official score -> computed composite (see below)
        "indicators": [
            ("green-pwndvi", "Greenness (NDVI)",           "{:.2f}"),
            ("aq-meanpm25",  "Air — PM2.5 (μg/m³)",        "{:.2f}"),
            ("aq-meanno2",   "Air — NO₂",                  "{:.2f}"),
            ("well-arsenic", "Water — arsenic (% wells)",  "{:.1%}"),
            ("well-uranium", "Water — uranium (% wells)",  "{:.1%}"),
        ],
    },
]

# Environment composite: direction of each field (+1 = higher is worse, -1 = higher is better)
ENV_FIELDS = {
    "green-pwndvi": -1,
    "aq-meanpm25": +1,
    "aq-meanno2": +1,
    "well-arsenic": +1,
    "well-uranium": +1,
}


def load_data():
    print("Loading Community Environs shapefile...")
    gdf = gpd.read_file(SHAPEFILE)

    print("Loading Health Atlas indicators...")
    atlas = pd.read_csv(ATLAS_CSV)
    atlas = atlas[atlas["region"] == "community-environs"].copy()
    atlas["id"] = atlas["id"].astype(int)

    # Precompute an Environment score (1-5) by percentile-ranking each CE
    # against all others. Higher score = worse environment.
    ranks = pd.DataFrame(index=atlas.index)
    for field, direction in ENV_FIELDS.items():
        r = atlas[field].rank(pct=True)
        ranks[field] = r if direction == +1 else (1 - r)
    atlas["_env_score"] = 1 + 4 * ranks.mean(axis=1)  # 0..1 -> 1..5

    print("Data loaded. Addresses are fetched on demand from the SODA API.")
    return gdf, atlas


app = FastAPI(title="HealthLocate API")

# Loaded once at startup (addresses are no longer bulk-downloaded)
GDF, ATLAS = load_data()


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
            # Category score (1-5): official quintile field, or the computed env score
            if cat["score_field"]:
                raw_score = a.get(cat["score_field"])
            else:
                raw_score = a.get("_env_score")

            score = None if pd.isna(raw_score) else round(float(raw_score), 1)
            level = None if score is None else int(round(score))
            level = None if level is None else max(1, min(5, level))

            indicators = [
                {"label": label, "value": _fmt(fmt, a.get(field))}
                for field, label, fmt in cat["indicators"]
            ]

            categories.append({
                "name": cat["name"],
                "score": score,
                "level": level,
                "level_label": LEVEL_LABELS.get(level, "—"),
                "indicators": indicators,
            })

    return {
        "address": address,
        "community": community,
        "lat": lat,
        "lng": lng,
        "ce_id": ce_id,
        "ce_name": ce_name,
        "categories": categories,
    }


# Serves the frontend (index.html, style.css, app.js) from the root.
# Mounted last: /api/* routes take priority because they are defined first.
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")
