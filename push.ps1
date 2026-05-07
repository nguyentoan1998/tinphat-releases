# ============================================================
# push.ps1 — Push code lên GitHub nhanh
# Cách dùng: .\push.ps1
#            .\push.ps1 -Message "fix: lỗi login"
#            .\push.ps1 -Branch "feature/new-screen"
# ============================================================

param(
    [string]$Message = "",
    [string]$Branch  = ""
)

# ── Màu sắc helper ──────────────────────────────────────────
function Write-Step { param($msg) Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }
function Write-Info { param($msg) Write-Host "  · $msg" -ForegroundColor Gray }

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $SCRIPT_DIR

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Tín Phát Metech — Push Tool      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan

# ── Kiểm tra có thay đổi không ──────────────────────────────
Write-Step "Kiểm tra trạng thái git..."

$status = git status --porcelain
if (-not $status) {
    Write-Info "Không có thay đổi nào để push."
    
    # Vẫn hỏi có muốn push branch hiện tại không
    $currentBranch = git branch --show-current
    Write-Info "Branch hiện tại: $currentBranch"
    $pushAnyway = Read-Host "  Push branch '$currentBranch' lên remote? (y/N)"
    if ($pushAnyway -eq 'y' -or $pushAnyway -eq 'Y') {
        git push origin $currentBranch
        if ($LASTEXITCODE -eq 0) { Write-OK "Đã push $currentBranch" }
        else { Write-Fail "Push thất bại!" }
    } else {
        Write-Info "Đã hủy."
    }
    Pop-Location
    exit 0
}

# Hiển thị các file thay đổi
Write-Host ""
Write-Host "  Files thay đổi:" -ForegroundColor Yellow
git status --short | ForEach-Object { Write-Host "    $_" -ForegroundColor White }

# ── Chọn branch ─────────────────────────────────────────────
$currentBranch = git branch --show-current
if (-not $Branch) {
    Write-Host ""
    Write-Info "Branch hiện tại: $currentBranch"
    $branchInput = Read-Host "  Push lên branch nào? (Enter = '$currentBranch')"
    $Branch = if ($branchInput) { $branchInput } else { $currentBranch }
}

# ── Nhập commit message ─────────────────────────────────────
if (-not $Message) {
    Write-Host ""
    Write-Host "  Gợi ý format commit:" -ForegroundColor DarkGray
    Write-Host "    feat: thêm tính năng mới" -ForegroundColor DarkGray
    Write-Host "    fix: sửa lỗi" -ForegroundColor DarkGray
    Write-Host "    chore: cập nhật config/deps" -ForegroundColor DarkGray
    Write-Host "    style: chỉnh UI/style" -ForegroundColor DarkGray
    Write-Host "    refactor: tái cấu trúc code" -ForegroundColor DarkGray
    Write-Host ""
    $Message = Read-Host "  Nhập commit message"
}

if (-not $Message) {
    Write-Fail "Commit message không được để trống!"
}

# ── Xác nhận ────────────────────────────────────────────────
Write-Host ""
Write-Info "Branch  : $Branch"
Write-Info "Message : $Message"
Write-Host ""
$confirm = Read-Host "  Xác nhận push? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Info "Đã hủy."
    Pop-Location
    exit 0
}

# ── Git add all ─────────────────────────────────────────────
Write-Step "Staging tất cả thay đổi..."
git add .
Write-OK "git add ."

# ── Git commit ──────────────────────────────────────────────
Write-Step "Commit..."
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Commit thất bại!"
}
Write-OK "Committed: $Message"

# ── Checkout branch nếu khác branch hiện tại ────────────────
if ($Branch -ne $currentBranch) {
    Write-Step "Chuyển sang branch '$Branch'..."
    $branchExists = git branch --list $Branch
    if ($branchExists) {
        git checkout $Branch
    } else {
        Write-Info "Branch '$Branch' chưa tồn tại, tạo mới..."
        git checkout -b $Branch
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Không thể chuyển sang branch '$Branch'!"
    }
    Write-OK "Đang ở branch: $Branch"
}

# ── Git push ────────────────────────────────────────────────
Write-Step "Push lên origin/$Branch..."
git push origin $Branch
if ($LASTEXITCODE -ne 0) {
    # Thử push với --set-upstream nếu branch mới
    Write-Info "Thử push với --set-upstream..."
    git push --set-upstream origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Push thất bại! Kiểm tra kết nối và quyền truy cập repo."
    }
}

# ── Hoàn tất ────────────────────────────────────────────────
$repoUrl = git remote get-url origin 2>$null
$repoUrl = $repoUrl -replace '\.git$', ''

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ Push thành công!                              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "Branch : $Branch"
Write-Info "Commit : $Message"
if ($repoUrl) {
    Write-Info "Repo   : $repoUrl/tree/$Branch"
}
Write-Host ""

Pop-Location
