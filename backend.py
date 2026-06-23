# -*- coding: utf-8 -*-
"""
HealthLocate — Backend API (FastAPI)
Replaces the Streamlit app. Keeps the same geopandas logic:
address -> point -> Community Environ -> Health Atlas indicators.
"""
from pathlib import Path
from io import StringIO

import pandas as pd
import geopandas as gpd
import requests
from shapely.geometry import Point

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent
SHAPEFILE = BASE_DIR / "shapefiles" / "ComEnviron.shp"
ATLAS_CSV = BASE_DIR / "data" / "NSHealthAtlasDataEnvirons.csv"
ADDRESS_URL = "https://data.novascotia.ca/api/views/tntn-er5g/rows.csv?accessType=DOWNLOAD"

# Indicator shortlist (Task 3) -> readable label + group
INDICATORS = {
    # Demographics
    "pop_total_all":        ("Total population", "Demographics", "{:,.0f}"),
    "medage_total":         ("Median age", "Demographics", "{:.1f}"),
    "pctpop-pct_total_65":  ("Population aged 65+", "Demographics", "{:.1%}"),
    # Material and social deprivation
    "msi-score2021":        ("MSI index (quintile 1-5)", "Deprivation", "{:.0f}"),
    "msi-lowincome":        ("Low-income households", "Deprivation", "{:.1%}"),
    "msi-unemploymentrate": ("Unemployment rate", "Deprivation", "{:.1%}"),
    "foc-licoaftax":        ("Below poverty line", "Deprivation", "{:.1%}"),
    # Housing
    "foc-subhous":          ("Inadequate housing", "Housing", "{:.1%}"),
    "foc-renters":          ("Renter households", "Housing", "{:.1%}"),
    # Social conditions
    "scs-score2021":        ("Social conditions (quintile)", "Social", "{:.0f}"),
    "scs-loneparent":       ("Lone-parent families", "Social", "{:.1%}"),
    "sds-score2021":        ("Social diversity (quintile)", "Social", "{:.0f}"),
    # Physical environment
    "green-pwndvi":         ("Green cover (NDVI)", "Environment", "{:.2f}"),
    "aq-meanpm25":          ("Mean PM2.5 (μg/m³)", "Environment", "{:.2f}"),
    "aq-radon":             ("Radon level (category)", "Environment", "{:.0f}"),
    # Behavioural
    "smk-curr_male":        ("Current smokers — male", "Behaviour", "{:.1%}"),
    "smk-curr_female":      ("Current smokers — female", "Behaviour", "{:.1%}"),
}


def load_data():
    print("Loading addresses from NS Open Data...")
    resp = requests.get(ADDRESS_URL, timeout=120)
    addresses = pd.read_csv(StringIO(resp.text), low_memory=False)

    print("Loading Community Environs shapefile...")
    gdf = gpd.read_file(SHAPEFILE)

    print("Loading Health Atlas indicators...")
    atlas = pd.read_csv(ATLAS_CSV)
    atlas = atlas[atlas["region"] == "community-environs"].copy()
    atlas["id"] = atlas["id"].astype(int)

    print("Data loaded.")
    return addresses, gdf, atlas


app = FastAPI(title="HealthLocate API")

# Loaded once at startup
DF, GDF, ATLAS = load_data()


@app.get("/api/search")
def search(civic: int, street: str):
    """Look up an address and return its Community Environ + indicators."""
    match = DF[
        (DF["CIVICNUM"] == civic)
        & (DF["STRNAME"].str.upper() == street.upper())
    ]
    if match.empty:
        raise HTTPException(status_code=404, detail="Address not found.")

    row = match.iloc[0]
    lat, lng, comm = float(row["LAT"]), float(row["LONG"]), str(row["COMM"])

    # Spatial join: point -> Community Environ
    point = gpd.GeoDataFrame([{"geometry": Point(lng, lat)}], crs="EPSG:4326")
    point = point.to_crs(GDF.crs)
    ce = gpd.sjoin(point, GDF, how="left", predicate="within").iloc[0]

    if pd.isna(ce["id"]):
        raise HTTPException(status_code=404, detail="No Community Environ for this point.")

    ce_id = int(ce["id"])
    ce_name = str(ce["name"]).title()

    # Health Atlas indicators for that CE
    atlas_row = ATLAS[ATLAS["id"] == ce_id]
    indicators = []
    if not atlas_row.empty:
        a = atlas_row.iloc[0]
        for field, (label, group, fmt) in INDICATORS.items():
            val = a.get(field)
            if pd.isna(val):
                display = "—"
            else:
                try:
                    display = fmt.format(val)
                except (ValueError, TypeError):
                    display = str(val)
            indicators.append({"label": label, "group": group, "value": display})

    return {
        "address": f"{civic} {street.title()}",
        "community": comm,
        "lat": lat,
        "lng": lng,
        "ce_id": ce_id,
        "ce_name": ce_name,
        "indicators": indicators,
    }


# Serves the frontend (index.html, style.css, app.js) from the root.
# Mounted last: /api/* routes take priority because they are defined first.
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")
