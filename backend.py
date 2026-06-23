# -*- coding: utf-8 -*-
"""
HealthLocate — Backend API (FastAPI)
Reemplaza la app de Streamlit. Mantiene la misma lógica de geopandas:
address → punto → Community Environ → indicadores del Health Atlas.
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

# Shortlist de indicadores (Tarea 3) -> etiqueta legible + grupo
INDICATORS = {
    # Demografía
    "pop_total_all":        ("Población total", "Demografía", "{:,.0f}"),
    "medage_total":         ("Edad mediana", "Demografía", "{:.1f}"),
    "pctpop-pct_total_65":  ("% población ≥65 años", "Demografía", "{:.1%}"),
    # Privación material y social
    "msi-score2021":        ("Índice MSI (quintil 1-5)", "Privación", "{:.0f}"),
    "msi-lowincome":        ("% hogares bajo ingreso", "Privación", "{:.1%}"),
    "msi-unemploymentrate": ("Tasa de desempleo", "Privación", "{:.1%}"),
    "foc-licoaftax":        ("% bajo línea de pobreza", "Privación", "{:.1%}"),
    # Vivienda
    "foc-subhous":          ("% vivienda inadecuada", "Vivienda", "{:.1%}"),
    "foc-renters":          ("% arrendatarios", "Vivienda", "{:.1%}"),
    # Condiciones sociales
    "scs-score2021":        ("Condiciones sociales (quintil)", "Social", "{:.0f}"),
    "scs-loneparent":       ("% familias monoparentales", "Social", "{:.1%}"),
    "sds-score2021":        ("Diversidad social (quintil)", "Social", "{:.0f}"),
    # Ambiente físico
    "green-pwndvi":         ("Cobertura vegetal (NDVI)", "Ambiente", "{:.2f}"),
    "aq-meanpm25":          ("PM2.5 promedio (μg/m³)", "Ambiente", "{:.2f}"),
    "aq-radon":             ("Nivel de radón (categoría)", "Ambiente", "{:.0f}"),
    # Comportamental
    "smk-curr_male":        ("Tabaquismo — hombres", "Comportamiento", "{:.1%}"),
    "smk-curr_female":      ("Tabaquismo — mujeres", "Comportamiento", "{:.1%}"),
}


def load_data():
    print("Cargando direcciones de NS Open Data...")
    resp = requests.get(ADDRESS_URL, timeout=120)
    addresses = pd.read_csv(StringIO(resp.text), low_memory=False)

    print("Cargando shapefile de Community Environs...")
    gdf = gpd.read_file(SHAPEFILE)

    print("Cargando indicadores del Health Atlas...")
    atlas = pd.read_csv(ATLAS_CSV)
    atlas = atlas[atlas["region"] == "community-environs"].copy()
    atlas["id"] = atlas["id"].astype(int)

    print("Datos cargados.")
    return addresses, gdf, atlas


app = FastAPI(title="HealthLocate API")

# Se cargan una sola vez al iniciar
DF, GDF, ATLAS = load_data()


@app.get("/api/search")
def search(civic: int, street: str):
    """Busca una dirección y devuelve su Community Environ + indicadores."""
    match = DF[
        (DF["CIVICNUM"] == civic)
        & (DF["STRNAME"].str.upper() == street.upper())
    ]
    if match.empty:
        raise HTTPException(status_code=404, detail="Address not found.")

    row = match.iloc[0]
    lat, lng, comm = float(row["LAT"]), float(row["LONG"]), str(row["COMM"])

    # Spatial join: punto -> Community Environ
    punto = gpd.GeoDataFrame([{"geometry": Point(lng, lat)}], crs="EPSG:4326")
    punto = punto.to_crs(GDF.crs)
    ce = gpd.sjoin(punto, GDF, how="left", predicate="within").iloc[0]

    if pd.isna(ce["id"]):
        raise HTTPException(status_code=404, detail="No Community Environ for this point.")

    ce_id = int(ce["id"])
    ce_name = str(ce["name"]).title()

    # Indicadores del Health Atlas para esa CE
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


# Sirve el frontend (index.html, style.css, app.js) desde la raíz.
# Se monta al final: las rutas /api/* tienen prioridad por estar definidas antes.
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")
