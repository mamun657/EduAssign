@echo off
REM Start the EduAssign ML sidecar (FastAPI + sentence-transformers).
REM Loads paraphrase-multilingual-MiniLM-L12-v2 on first request.
REM Listens on http://127.0.0.1:8001 by default; override with EDUASSIGN_ML_PORT.

setlocal
set PORT=8001
if not "%EDUASSIGN_ML_PORT%"=="" set PORT=%EDUASSIGN_ML_PORT%

cd /d "%~dp0"
echo [ml-service] starting uvicorn on %PORT% ...
python -m uvicorn app:app --host 127.0.0.1 --port %PORT% --log-level info
endlocal