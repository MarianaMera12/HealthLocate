# -*- coding: utf-8 -*-
"""
Build data/canale_by_ce.csv — Can-ALE (Active Living / active transport) aggregated
from Dissemination Area (DA) level up to Community Environ (CE) level.

Pipeline:
  1. Read StatCan 2021 DA boundaries, keep Nova Scotia (PRUID == 12).
  2. Take each DA's representative point and spatial-join it to the CE polygons
     (ComEnviron.shp) to get a DAUID -> CE crosswalk.
  3. Join the Can-ALE 2021 metrics by DAUID.
  4. Average ALE class + component metrics per CE and write the result.

Inputs (download once; not committed — large files):
  - DA boundaries: https://www12.statcan.gc.ca/census-recensement/2021/geo/
        sip-pis/boundary-limites/files-fichiers/lda_000b21a_e.zip  (unzip -> .shp)
  - Can-ALE 2021: https://raw.githubusercontent.com/walkabillylab/Can-ALE/main/
        Results/Can-ALE/CanALE_2021.csv

Usage:
  python scripts/build_canale_by_ce.py <path_to_lda_000b21a_e.shp> <path_to_CanALE_2021.csv>
"""
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
CE_SHP = BASE_DIR / "shapefiles" / "ComEnviron.shp"
OUT_CSV = BASE_DIR / "data" / "canale_by_ce.csv"


def main(da_shp: str, canale_csv: str) -> None:
    # 1. NS DA polygons -> representative points
    da = gpd.read_file(da_shp)
    da = da[da["PRUID"] == "12"].copy()
    da["DAUID"] = da["DAUID"].astype("int64")
    da["geometry"] = da.representative_point()

    # 2. spatial join DA point -> CE polygon
    ce = gpd.read_file(CE_SHP)[["id", "geometry"]]
    da = da.to_crs(ce.crs)
    xwalk = gpd.sjoin(da[["DAUID", "geometry"]], ce, how="left", predicate="within")

    # 3. join Can-ALE metrics by DAUID
    canale = pd.read_csv(canale_csv)
    merged = xwalk.dropna(subset=["id"]).merge(canale, on="DAUID", how="left")

    # 4. aggregate per CE
    agg = (
        merged.groupby("id")
        .agg(
            ale_class=("ALE_index_class", "mean"),
            ale_index=("ALE_index", "mean"),
            int_density=("int_density", "mean"),
            dwel_density=("dwel_density", "mean"),
            poi_count=("poi_count", "mean"),
            n_das=("DAUID", "count"),
        )
        .reset_index()
        .rename(columns={"id": "ce_id"})
    )
    agg["ce_id"] = agg["ce_id"].astype(int)
    agg.to_csv(OUT_CSV, index=False)
    print(f"Wrote {OUT_CSV} — {len(agg)} CEs")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
