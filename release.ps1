# Build APK và gửi cho người nhận qua Telegram.
#   .\release.ps1                      build web + APK rồi gửi
#   .\release.ps1 -SkipBuild           chỉ gửi ket-sat.apk hiện có
#   .\release.ps1 -Note "sửa còi hú"   thêm ghi chú vào tin nhắn
# Cần file release.env (không đưa lên git):
#   TELEGRAM_BOT_TOKEN=...
#   TELEGRAM_CHAT_ID=...
param(
  [switch]$SkipBuild,
  [string]$Note = ''
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$web  = Join-Path $root 'web'
$apk  = Join-Path $root 'ket-sat.apk'

# ---- Đọc release.env ----
$envFile = Join-Path $root 'release.env'
if (-not (Test-Path $envFile)) { throw "Thiếu $envFile (cần TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID)." }
$cfg = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') { $cfg[$Matches[1]] = $Matches[2].Trim('"', "'") }
}
foreach ($k in 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID') {
  if (-not $cfg[$k]) { throw "release.env thiếu $k" }
}

# ---- Build ----
if (-not $SkipBuild) {
  $env:JAVA_HOME        = 'E:\android-dev\jdk21\jdk-21.0.13.1+2'
  $env:ANDROID_HOME     = 'E:\android-dev\sdk'
  $env:GRADLE_USER_HOME = 'E:\android-dev\gradle-home'

  Write-Host '== Build web và đồng bộ vào Android ==' -ForegroundColor Cyan
  Push-Location $web
  try {
    npm run build:app
    if ($LASTEXITCODE -ne 0) { throw 'Build web thất bại.' }
  } finally { Pop-Location }

  Write-Host '== Build APK ==' -ForegroundColor Cyan
  Push-Location (Join-Path $web 'android')
  try {
    .\gradlew.bat assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Build APK thất bại.' }
  } finally { Pop-Location }

  Copy-Item (Join-Path $web 'android\app\build\outputs\apk\debug\app-debug.apk') $apk -Force
}
if (-not (Test-Path $apk)) { throw "Không thấy $apk. Chạy lại không có -SkipBuild." }

# ---- Gửi Telegram ----
$sizeMb  = [math]::Round((Get-Item $apk).Length / 1MB, 1)
$stamp   = Get-Date -Format 'dd/MM HH:mm'
$commit  = (git -C $root rev-parse --short HEAD 2>$null)
# Caption để không dấu: tham số curl.exe trong PowerShell 5.1 không giữ được tiếng Việt.
$caption = "Ket sat - ban $stamp ($sizeMb MB)"
if ($commit) { $caption += " - $commit" }
if ($Note)   { $caption += "`n$Note" }
$caption += "`nCai de len ban cu."

Write-Host "== Gửi $sizeMb MB qua Telegram ==" -ForegroundColor Cyan
$url = "https://api.telegram.org/bot$($cfg['TELEGRAM_BOT_TOKEN'])/sendDocument"
# --form-string cho giá trị chữ; chỉ file mới dùng -F. Token nằm trong URL nên không in ra màn hình.
$out = curl.exe -s -m 300 $url `
  --form-string "chat_id=$($cfg['TELEGRAM_CHAT_ID'])" `
  --form-string "caption=$caption" `
  -F "document=@$apk;filename=ket-sat.apk;type=application/vnd.android.package-archive"
$res = $out | ConvertFrom-Json
if (-not $res.ok) { throw "Telegram báo lỗi: $($res.description)" }
Write-Host 'Đã gửi xong.' -ForegroundColor Green
