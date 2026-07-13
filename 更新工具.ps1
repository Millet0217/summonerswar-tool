# 【已廢棄】本腳本會呼叫 build.ps1 用過時模板覆寫成品，回退近期功能（配裝引擎等）。
# 成品「魔靈分析工具.html」為唯一真相，請直接編輯它。
Write-Error "更新工具.ps1 已廢棄：執行會回退成品近期功能。請直接編輯 魔靈分析工具.html"
exit 1
$ErrorActionPreference="Stop"
$w="D:\AI用的\魔靈Json分析\work"
Write-Host "[1/2] 套用對照表、產生資料..." -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File "$w\gen_payload.ps1"
Write-Host "[2/2] 重建 HTML..." -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File "$w\build.ps1"
Write-Host "完成! 開啟 魔靈分析工具.html 即可" -ForegroundColor Green
