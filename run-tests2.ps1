$env:E2E_ENABLED = '1'
Write-Host "E2E_ENABLED: $env:E2E_ENABLED"
Write-Host "Running playwright test..."
Execute Assembly: npx playwright test --reporter=list