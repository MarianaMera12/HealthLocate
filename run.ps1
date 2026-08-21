# Arranca el backend de HealthLocate (FastAPI + frontend)
# Uso:  ./run.ps1   -- luego abre dr
$env:PYTHONUTF8 = "1"
python -m uvicorn backend:app --host 127.0.0.1 --port 8000 --reload
