# ============================================================
# release.ps1 — Build APK + tạo GitHub Release tự động
# Cách dùng: .\release.ps1
# ============================================================

param(
    [string]$Version = ""
)

# ── Màu sắc helper ──────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail  { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info  { param($msg) Write-Host "  · $msg" -ForegroundColor Gray }

# ── Cấu hình ────────────────────────────────────────────────
$JAVA_HOME    = "C:\Program Files\Android\Android Studio\jbr"
$ANDROID_HOME = "C:\Users\PC\AppData\Local\Android\Sdk"
$SCRIPT_DIR   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ANDROID_DIR  = Join-Path $SCRIPT_DIR "android"
$APK_DIR      = Join-Path $ANDROID_DIR "app\build\outputs\apk\release"
$APP_JSON     = Join-Path $SCRIPT_DIR "app.json"

# ── Nhập version ────────────────────────────────────────────
if (-not $Version) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║     Tín Phát Metech — Release Tool   ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    $Version = Read-Host "  Nhập version (ví dụ: 1.0.2)"
}

# Validate format x.y.z
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Fail "Version không hợp lệ: '$Version'. Phải theo format x.y.z (ví dụ: 1.0.2)"
    exit 1
}

$Tag = "v$Version"
Write-Host ""
Write-Info "Version : $Version"
Write-Info "Tag     : $Tag"
Write-Host ""

# Xác nhận
$confirm = Read-Host "  Tiếp tục build và release $Tag? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Info "Đã hủy."
    exit 0
}

# ── Set environment ──────────────────────────────────────────
$env:JAVA_HOME    = $JAVA_HOME
$env:ANDROID_HOME = $ANDROID_HOME
$env:PATH         = "$JAVA_HOME\bin;$ANDROID_HOME\tools;$ANDROID_HOME\platform-tools;$env:PATH"

# ── Bước 1: Cập nhật version trong app.json ─────────────────
Write-Step "Cập nhật version trong app.json → $Version"
try {
    $json = Get-Content $APP_JSON -Raw | ConvertFrom-Json
    $json.expo.version = $Version
    $json | ConvertTo-Json -Depth 20 | Set-Content $APP_JSON -Encoding UTF8
    Write-OK "app.json đã cập nhật"
} catch {
    Write-Fail "Không thể cập nhật app.json: $_"
    exit 1
}

# ── Bước 2: Build APK ───────────────────────────────────────
Write-Step "Build Release APK (bỏ qua lint)..."
Write-Info "Quá trình này mất 5-15 phút, vui lòng chờ..."

Push-Location $ANDROID_DIR
try {
    & ".\gradlew.bat" assembleRelease -x lintVitalAnalyzeRelease -x lintVitalRelease --no-daemon
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Build thất bại! Exit code: $LASTEXITCODE"
        Pop-Location
        exit 1
    }
} catch {
    Write-Fail "Lỗi khi build: $_"
    Pop-Location
    exit 1
}
Pop-Location

# Kiểm tra APK tồn tại
$apkSource = Join-Path $APK_DIR "app-release.apk"
if (-not (Test-Path $apkSource)) {
    Write-Fail "Không tìm thấy APK tại: $apkSource"
    exit 1
}

# Đổi tên APK theo version
$apkDest = Join-Path $APK_DIR "app-$Tag-release.apk"
Copy-Item $apkSource $apkDest -Force
$apkSize = [math]::Round((Get-Item $apkDest).Length / 1MB, 1)
Write-OK "APK đã build: app-$Tag-release.apk ($apkSize MB)"

# ── Bước 3: Git commit app.json ─────────────────────────────
Write-Step "Commit app.json với version mới..."
Push-Location $SCRIPT_DIR
try {
    git add app.json
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "chore: bump version to $Version"
        Write-OK "Đã commit app.json"
    } else {
        Write-Info "app.json không thay đổi, bỏ qua commit"
    }
} catch {
    Write-Fail "Lỗi git commit: $_"
}

# ── Bước 4: Push code lên main ──────────────────────────────
Write-Step "Push code lên main..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Push thất bại! Kiểm tra kết nối và quyền truy cập repo."
    Pop-Location
    exit 1
}
Write-OK "Đã push lên main"

# ── Bước 5: Tạo git tag ─────────────────────────────────────
Write-Step "Tạo tag $Tag..."

# Xóa tag cũ nếu tồn tại
$existingTag = git tag -l $Tag
if ($existingTag) {
    Write-Info "Tag $Tag đã tồn tại, xóa và tạo lại..."
    git tag -d $Tag | Out-Null
    git push origin --delete $Tag 2>$null | Out-Null
}

git tag $Tag
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Không thể tạo tag $Tag"
    Pop-Location
    exit 1
}
Write-OK "Đã tạo tag $Tag"

# ── Bước 6: Push tag ────────────────────────────────────────
Write-Step "Push tag $Tag lên GitHub..."
git push origin $Tag
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Push tag thất bại!"
    Pop-Location
    exit 1
}
Write-OK "Đã push tag $Tag"

# ── Bước 7: Tạo GitHub Release ──────────────────────────────
Write-Step "Tạo GitHub Release $Tag..."

# Kiểm tra gh CLI
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Info "GitHub CLI (gh) chưa được cài. Tạo release thủ công:"
    Write-Info "  1. Vào https://github.com/nguyentoan1998/tinphat-releases/releases/new"
    Write-Info "  2. Chọn tag: $Tag"
    Write-Info "  3. Upload file: $apkDest"
    Write-Host ""
    Write-OK "Build hoàn tất! APK: $apkDest"
    Pop-Location
    exit 0
}

# Lấy release notes từ git log
$releaseNotes = git log --oneline -10 --no-merges | ForEach-Object { "- $_" } | Out-String

# Tạo release với gh CLI
gh release create $Tag `
    --title "Release $Tag" `
    --notes $releaseNotes `
    "$apkDest#app-$Tag-release.apk"

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Tạo GitHub Release thất bại!"
    Write-Info "Tạo thủ công tại: https://github.com/nguyentoan1998/tinphat-releases/releases/new"
    Pop-Location
    exit 1
}

Pop-Location

# ── Hoàn tất ────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ Release $Tag hoàn tất!                       " -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "APK    : $apkDest"
Write-Info "Release: https://github.com/nguyentoan1998/tinphat-releases/releases/tag/$Tag"
Write-Host ""
