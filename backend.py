# -*- coding: utf-8 -*-
"""
HealthLocate — Backend API (FastAPI)
Address autocomplete via the NS Open Data SODA API, then a local geopandas
spatial join: point -> Community Environ -> Health Atlas indicators.
"""
import math
import re
import time
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
# Indicator tuples: (field, label, format, definition, direction)
#   direction: "higher_worse" | "higher_better" | "neutral" (drives the traffic-light colour)
CATEGORIES = [
    {
        "name": "Income & Economic",
        "icon": "income",
        "scored": True,
        "score_from": "msi-score2021",
        "indicators": [
            ("msi-unemploymentrate", "Unemployment rate", "{:.1%}", "Share of the labour force that is unemployed.", "higher_worse"),
            ("msi-incomeavginc",     "Average income",    "${:,.0f}", "Average individual income.", "higher_better"),
            ("msi-incomegt30house",  "High housing cost", "{:.1%}", "Households spending over 30% of income on housing.", "higher_worse"),
            ("msi-educationlow",     "Low education",     "{:.1%}", "Adults without a high-school diploma.", "higher_worse"),
        ],
    },
    {
        "name": "Social Vulnerability",
        "icon": "social",
        "scored": True,
        "score_from": "scs-score2021",
        "indicators": [
            ("scs-alone",      "Living alone",                    "{:.1%}", "Residents who live alone.", "higher_worse"),
            ("scs-loneparent", "Lone-parent families",            "{:.1%}", "Families led by a single parent.", "higher_worse"),
            ("scs-sdw",        "Separated, divorced, or widowed", "{:.1%}", "Adults who are separated, divorced, or widowed.", "higher_worse"),
        ],
    },
    {
        "name": "Community Diversity",
        "icon": "diversity",
        "scored": True,
        "score_from": "sds-score2021",
        "indicators": [
            ("sds-recentimmigrant", "Recent immigrants",             "{:.1%}", "Residents who immigrated in the last 5 years.", "neutral"),
            ("sds-offlanghome",     "Non-official language at home", "{:.1%}", "Households speaking a non-official language at home.", "neutral"),
            ("sds-moved1yr",        "Moved within the last year",    "{:.1%}", "Residents who moved in the past year.", "neutral"),
        ],
    },
    {
        "name": "Transit / Active Living",
        "icon": "transit",
        "scored": True,
        "score_from": "ale",  # community-level ALE data from Saeed
        "indicators": [
            ("_ale_index",   "Active Living index", "{:.2f}", "Walkability / active-living environment score (1 low – 5 high).", "higher_better"),
            ("_ale_transit", "Transit access",      "{:.2f}", "Public-transit access score (1 low – 5 high).", "higher_better"),
        ],
    },
    {
        # Environment has no official composite yet (Saeed is computing the EQI).
        "name": "Environment",
        "icon": "environment",
        "scored": False,
        "score_from": None,
        "indicators": [
            ("green-pwndvi", "Greenness",       "{:.2f}", "Vegetation greenness (NDVI, 0–1). Higher is greener.", "higher_better"),
            ("aq-meanpm25",  "Air — PM2.5",     "{:.2f}", "Average fine particulate matter (µg/m³). Lower is cleaner.", "higher_worse"),
            ("aq-meanno2",   "Air — NO₂",       "{:.2f}", "Average nitrogen dioxide. Lower is cleaner.", "higher_worse"),
            ("well-arsenic", "Water — arsenic", "{:.1%}", "Private wells exceeding the arsenic limit.", "higher_worse"),
            ("well-uranium", "Water — uranium", "{:.1%}", "Private wells exceeding the uranium limit.", "higher_worse"),
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

# Provincial mean of every indicator field, for relative ("above/below NS avg") display
_ALL_FIELDS = {ind[0] for cat in CATEGORIES for ind in cat["indicators"]}
NS_MEANS = {f: ATLAS[f].mean() for f in _ALL_FIELDS if f in ATLAS.columns}


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
    """Map a 1-5 level to a color-status key. Higher score = better."""
    if level is None:
        return "pending"
    if level >= 4:
        return "favorable"      # 4-5 good
    if level == 3:
        return "moderate"       # 3 moderate
    return "attention"          # 1-2 needs attention


def _letter(level):
    """Letter grade (doctors in Toronto preferred letters over words)."""
    if level is None:
        return "–"
    if level >= 4:
        return "A"
    if level == 3:
        return "B"
    return "C"


def _relative(field, val):
    """Where a value sits vs the provincial mean: above / below / near."""
    m = NS_MEANS.get(field)
    if val is None or pd.isna(val) or m is None or pd.isna(m):
        return None, "—"
    if m != 0 and abs(val - m) <= 0.10 * abs(m):
        return "near", "Near NS average"
    if val > m:
        return "above", "Above NS average"
    return "below", "Below NS average"


_TONE_COLORS = {"good": "#1f9d57", "bad": "#d14343", "near": "#d98a00", "neutral": "#5b6b7b"}


def _tone(direction, relative):
    """Traffic-light tone for a value vs the NS average, given the indicator direction."""
    if relative is None or direction == "neutral":
        return "neutral", _TONE_COLORS["neutral"]
    if relative == "near":
        return "near", _TONE_COLORS["near"]
    good = (relative == "above" and direction == "higher_better") or \
           (relative == "below" and direction == "higher_worse")
    key = "good" if good else "bad"
    return key, _TONE_COLORS[key]


def _qual_label(level):
    """Human, number-free label for a 1-5 level (doctors don't want the exact number)."""
    return {5: "Excellent", 4: "Good", 3: "Moderate", 2: "Needs attention", 1: "Needs attention"}.get(level, "—")


# Friendly phrasing for the overall one-line summary
_FRIENDLY = {
    "Income & Economic": "economic conditions",
    "Social Vulnerability": "social support",
    "Community Diversity": "community diversity",
    "Transit / Active Living": "transportation access",
}


def _join(items):
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " and " + items[-1]


def _build_overall(scored):
    """Overall conclusion from the scored categories (the 5-second read)."""
    levels = [c["level"] for c in scored if c["level"] is not None]
    if not levels:
        return None
    mean = sum(levels) / len(levels)

    if mean >= 3.5:
        status, headline = "favorable", "Favorable community conditions"
    elif mean >= 2.5:
        status, headline = "moderate", "Average community conditions"
    else:
        status, headline = "attention", "Community barriers detected"

    strengths = [_FRIENDLY.get(c["name"], c["name"]) for c in scored if (c["level"] or 0) >= 4]
    concerns = [_FRIENDLY.get(c["name"], c["name"]) for c in scored if (c["level"] or 0) <= 2]

    if concerns:
        sentence = f"Barriers in {_join(concerns)}."
        if strengths:
            sentence += f" Strengths in {_join(strengths)}."
    elif strengths:
        sentence = f"This patient lives in an area with strong {_join(strengths)}."
    else:
        sentence = "Community conditions are around the provincial average."

    return {
        "status": status,
        "color": STATUS_COLORS[status],
        "headline": headline,
        "sentence": sentence,
    }


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
            indicators = []
            for field, label, fmt, definition, direction in cat["indicators"]:
                raw = a.get(field)
                rel, rel_label = _relative(field, raw)
                tone, tone_color = _tone(direction, rel)
                indicators.append({
                    "label": label,
                    "definition": definition,
                    "value": _fmt(fmt, raw),                 # this community
                    "ns_avg": _fmt(fmt, NS_MEANS.get(field)),  # provincial average
                    "relative": rel,                         # above / below / near / None
                    "relative_label": rel_label,
                    "tone": tone,
                    "tone_color": tone_color,
                })

            if not cat.get("scored", True):
                # Environment EQI is still pending — show a temporary placeholder
                # rating (fixed) so the card looks consistent with the others.
                categories.append({
                    "name": cat["name"],
                    "icon": cat["icon"],
                    "scored": False,
                    "color": STATUS_COLORS["favorable"],
                    "status": "placeholder",
                    "grade": "A",                    # fixed placeholder until EQI arrives
                    "status_label": "Good",
                    "score": None,
                    "level": None,
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
                "grade": _letter(level),                 # letter grade (no words)
                "status_label": _qual_label(level),
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

    overall = _build_overall([c for c in categories if c.get("scored")])

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
        "overall": overall,
        "categories": categories,
    }


@app.get("/api/ns-outline")
def ns_outline():
    """Nova Scotia silhouette as GeoJSON (for the small locator map)."""
    return NS_OUTLINE


# ---------- Phase 2: Social Prescribing (nearby services via OpenStreetMap) ----------
# Primary + backups (osm.ch dropped — it returns empty results for NS).
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def _overpass(query):
    """Run an Overpass query with mirror fallback + one retry pass. Returns elements or None."""
    headers = {"User-Agent": "HealthLocate/1.0 (prototype; primary-care tool)"}
    for attempt in range(2):
        for url in OVERPASS_URLS:
            try:
                resp = requests.post(url, data={"data": query}, headers=headers, timeout=40)
                if resp.status_code != 200:
                    continue
                payload = resp.json()
                # 200 + empty + "remark" == the server is overloaded/rate-limited: try the next.
                if not payload.get("elements") and payload.get("remark"):
                    continue
                return payload.get("elements", [])
            except (requests.RequestException, ValueError):
                continue
        time.sleep(1.0)   # brief backoff before the second pass
    return None

# Overpass tag filters per service category
CATEGORY_FILTERS = {
    # Pharmacies are also tagged as a chemist shop, or a convenience store with a
    # pharmacy counter (pharmacy=yes) — include all so none are missed.
    "pharmacy":      ['["amenity"="pharmacy"]', '["shop"="chemist"]', '["pharmacy"="yes"]'],
    "mental_health": ['["healthcare"="psychotherapist"]', '["healthcare"="counselling"]',
                      '["amenity"="clinic"]["healthcare"="mental_health"]'],
    "physiotherapy": ['["healthcare"="physiotherapist"]'],
    "walkin":        ['["amenity"="clinic"]', '["amenity"="doctors"]'],
    "laboratory":    ['["healthcare"="laboratory"]', '["amenity"="laboratory"]'],
}


def _haversine_km(lat1, lng1, lat2, lng2):
    p = math.pi / 180
    a = (0.5 - math.cos((lat2 - lat1) * p) / 2
         + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lng2 - lng1) * p)) / 2)
    return 2 * 6371 * math.asin(math.sqrt(a))


@app.get("/api/services")
def services(lat: float, lng: float, category: str, radius: int = 10000):
    """Top-5 nearest services of a category around a point (OpenStreetMap / Overpass)."""
    filters = CATEGORY_FILTERS.get(category)
    if not filters:
        raise HTTPException(status_code=400, detail="Unknown service category.")

    body = ""
    for f in filters:
        body += f"node{f}(around:{radius},{lat},{lng});way{f}(around:{radius},{lat},{lng});"
    query = f"[out:json][timeout:25];({body});out center tags;"

    elements = _overpass(query)
    if elements is None:
        raise HTTPException(status_code=502, detail="Service lookup is temporarily unavailable.")

    results, seen = [], set()
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
        elat = el.get("lat") or (el.get("center") or {}).get("lat")
        elng = el.get("lon") or (el.get("center") or {}).get("lon")
        if elat is None or elng is None or name.lower() in seen:
            continue
        seen.add(name.lower())

        # Street address from addr:* tags, if present
        hn, st, city = tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:city")
        parts = []
        if hn and st:
            parts.append(f"{hn} {st}")
        elif st:
            parts.append(st)
        if city:
            parts.append(city)
        address = ", ".join(parts) or None

        website = tags.get("website") or tags.get("contact:website")

        results.append({
            "name": name,
            "address": address,
            "distance_km": round(_haversine_km(lat, lng, elat, elng), 1),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "hours": tags.get("opening_hours"),
            "website": website,
            "maps_url": f"https://www.google.com/maps/dir/?api=1&destination={elat},{elng}",
        })

    results.sort(key=lambda r: r["distance_km"])
    return results[:5]


# Serves the frontend (index.html, style.css, app.js) from the root.
# Mounted last: /api/* routes take priority because they are defined first.
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")
