$env:E2E_ENABLED = '1'
$env:CI = ''
$env:E2E_BASE_URL = 'http://localhost:8080'

Write-Host "Running e2e tests with E2E_ENABLED=$env:E2E_ENABLED"
Write-Host "Base URL: $env:E2E_BASE_URL"

& 'C:\Users\IPREP\Desktop\GNET-2026\node_modules\.bin\playwright' test --reporter=list > test-output.txt 2>&1
Write-Host "Tests complete. Output written to test-output.txt"