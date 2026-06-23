import streamlit as st
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from io import StringIO
import requests
import folium
from streamlit_folium import st_folium

# Configuración de la página
st.set_page_config(page_title="HealthLocate", page_icon="🏥", layout="wide")
st.title("🏥 HealthLocate")
st.subheader("Patient Profile Tool")

# Cargar datos (solo una vez)
@st.cache_data
def cargar_datos():
    url = "https://data.novascotia.ca/api/views/tntn-er5g/rows.csv?accessType=DOWNLOAD"
    response = requests.get(url)
    df = pd.read_csv(StringIO(response.text), low_memory=False)
    gdf = gpd.read_file(r"C:\Users\maria\OneDrive\Escritorio\HealthLocate\shapefiles\ComEnviron.shp")
    return df, gdf

with st.spinner("Loading data..."):
    df, gdf = cargar_datos()

# Inicializar session state
if "resultado" not in st.session_state:
    st.session_state.resultado = None

# Formulario de búsqueda
st.markdown("### Search Patient Address")
col1, col2 = st.columns([1, 3])
with col1:
    numero = st.text_input("Civic Number", placeholder="6281")
with col2:
    calle = st.text_input("Street Name", placeholder="Jennings")

if st.button("Search", type="primary"):
    if numero and calle:
        resultado = df[
            (df['CIVICNUM'] == int(numero)) & 
            (df['STRNAME'].str.upper() == calle.upper())
        ]
        
        if not resultado.empty:
            lat = resultado.iloc[0]['LAT']
            lng = resultado.iloc[0]['LONG']
            comm = resultado.iloc[0]['COMM']
            
            punto = gpd.GeoDataFrame([{'geometry': Point(lng, lat)}], crs="EPSG:4326")
            punto = punto.to_crs(gdf.crs)
            ce_resultado = gpd.sjoin(punto, gdf, how="left", predicate="within")
            ce_id = ce_resultado.iloc[0]['id']
            ce_name = ce_resultado.iloc[0]['name']

            # Guardar en session state
            st.session_state.resultado = {
                'lat': lat, 'lng': lng,
                'comm': comm, 'ce_id': ce_id, 'ce_name': ce_name,
                'direccion': f"{numero} {calle}"
            }
        else:
            st.session_state.resultado = None
            st.error("Address not found. Please check the civic number and street name.")
    else:
        st.warning("Please enter both civic number and street name.")

# Mostrar resultados si existen
if st.session_state.resultado:
    r = st.session_state.resultado
    st.success(f"✅ Address found: {r['direccion']}, {r['comm']}")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 📍 Location")
        m = folium.Map(location=[r['lat'], r['lng']], zoom_start=15)
        folium.Marker([r['lat'], r['lng']], popup=r['direccion']).add_to(m)
        st_folium(m, width=500, height=400)
    
    with col2:
        st.markdown("### 👤 Patient Profile")
        st.info(f"**Community Environ:** {r['ce_name']} (ID: {r['ce_id']})")
        st.info(f"**Community:** {r['comm']}")
        st.warning("⏳ Census indicators coming soon...")