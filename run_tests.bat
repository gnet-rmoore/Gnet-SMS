@echo off
cd /d C:\Users\IPREP\Desktop\GNET-2026
set E2E_ENABLED=1
set E2E_BASE_URL=http://localhost:8080
echo Starting Vite dev server...
start "Vite Dev Server" node node_modules\.bin\vite --port 8080
timeout /t 5 /nobreak > nul
echo Running e2e tests...
npm run test:e2e 2>&1