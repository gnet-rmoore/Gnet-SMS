$env:VITE_PORT = '8080'
$env:E2E_ENABLED = '1'

Write-Host "Starting Vite dev server on port 8080..."
& 'C:\Users\IPREP\Desktop\GNET-2026\node_modules\.bin\vite' --port 8080