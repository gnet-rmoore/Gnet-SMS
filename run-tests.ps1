$env:E2E_ENABLED = '1'
$env:CI = ''
$env:E2E_BASE_URL = 'http://localhost:8080'
$env:NODE_OPTIONS = '-NoExit'

Write-Host "Running e2e tests..."
& 'node_modules\.bin\playwright' test --reporter=list 2>&1