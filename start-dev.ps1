# start-dev.ps1 - Khoi dong Expo + Cloudflare Tunnel
# Chay: .\start-dev.ps1

$HOSTNAME = "app.tinphatmetech.online"
$CLOUDFLARE_CONFIG = "C:\Users\PC\.cloudflared\config.yml"
$TUNNEL_ID = "7080f287-e7df-4d26-b26f-81a5c0d6b758"

# Tim port trong config hien tai
$currentPort = (Get-Content $CLOUDFLARE_CONFIG | Select-String "localhost:(\d+)").Matches[0].Groups[1].Value

Write-Host "Port hien tai trong config: $currentPort" -ForegroundColor Yellow

# Kiem tra port nao dang trong
$port = 8081
if (Test-NetConnection -ComputerName localhost -Port 8081 -InformationLevel Quiet -WarningAction SilentlyContinue) {
    Write-Host "Port 8081 dang duoc su dung boi process khac" -ForegroundColor Red
}

# Cap nhat config neu can
if ($currentPort -ne $port.ToString()) {
    Write-Host "Cap nhat config: port $currentPort -> $port" -ForegroundColor Cyan
    (Get-Content $CLOUDFLARE_CONFIG) -replace "localhost:$currentPort", "localhost:$port" | Set-Content $CLOUDFLARE_CONFIG
}

# Window 1: Expo
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd 'd:\Tin phat app\mobile'; `$env:REACT_NATIVE_PACKAGER_HOSTNAME='$HOSTNAME'; npx expo start --clear" -WindowStyle Normal

Start-Sleep -Seconds 5

# Window 2: Cloudflare Tunnel
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cloudflared tunnel run $TUNNEL_ID" -WindowStyle Normal

Write-Host ""
Write-Host "OK - Da khoi dong!" -ForegroundColor Green
Write-Host "Expo Go -> Enter URL manually -> exp://$HOSTNAME" -ForegroundColor Cyan
Write-Host ""
Write-Host "Neu Expo chay tren port khac 8081, dung terminal Expo xem port" -ForegroundColor Yellow
Write-Host "roi chay: Update-CloudflarePort.ps1 <port>" -ForegroundColor Yellow
