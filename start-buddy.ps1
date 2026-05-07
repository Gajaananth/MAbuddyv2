# ZIUM NOVA — SYSTEM STARTUP PROTOCOL
# Runs both the Server and Client in the background.

Write-Host "Activating Zium Nova Core..." -ForegroundColor Cyan

# Start Server in a new background process
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "d:\ma_buddy" -WindowStyle Hidden

# Start Client in a new background process
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "d:\ma_buddy\client" -WindowStyle Hidden

Write-Host "`n[ONLINE] Zium Nova is now running in the background." -ForegroundColor Green
Write-Host "• Server: http://localhost:3001" -ForegroundColor Gray
Write-Host "• Client: http://localhost:5173" -ForegroundColor Gray
Write-Host "`nYou can now use .\zn-cli.ps1 to chat directly.`n" -ForegroundColor Gray
