# Arranca el backend de HealthLocate (FastAPI + frontend)
# Uso:  ./run.ps1   -- luego abre http://127.0.0.1:8000
$env:PYTHONUTF8 = "1"
python -m uvicorn backend:app --host 127.0.0.1 --port 8000 --reload
