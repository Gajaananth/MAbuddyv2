# ZIUM NOVA — COMMAND LINE INTERFACE (CLI)
# Talk to Zium Nova directly from your terminal. No browser required.

$api_url = "http://localhost:3001/api/chat"
$operator_key = "nova-operator-99-alpha"

function Send-ZiumNovaMessage {
    param([string]$message)
    
    $body = @{
        message = $message
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
        "X-Operator-Protocol-Key" = $operator_key
    }

    try {
        Write-Host "`n[Thinking...]" -ForegroundColor Cyan
        $response = Invoke-RestMethod -Uri $api_url -Method Post -Body $body -Headers $headers -TimeoutSec 60
        
        $content = $response.data.message.content
        
        Write-Host "`n══════════════════════════════════════════════════" -ForegroundColor DarkGray
        Write-Host "ZIUM NOVA — CORE RESPONSE" -ForegroundColor Green
        Write-Host "══════════════════════════════════════════════════`n" -ForegroundColor DarkGray
        Write-Host $content
        Write-Host "`n══════════════════════════════════════════════════`n" -ForegroundColor DarkGray
    } catch {
        Write-Host "`n[!] ERROR: Connection failed. Ensure the server is running." -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor DarkGray
    }
}

Write-Host "`n  ╔══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║       ZIUM NOVA — CLI PROTOCOL       ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Green
Write-Host "  Operational Mode: ACTIVE (No Browser)" -ForegroundColor Gray
Write-Host "  Type 'exit' to disconnect.`n" -ForegroundColor Gray

while ($true) {
    $user_input = Read-Host "Operator"
    if ($user_input -eq "exit") { break }
    if ([string]::IsNullOrWhiteSpace($user_input)) { continue }
    
    Send-ZiumNovaMessage -message $user_input
}
