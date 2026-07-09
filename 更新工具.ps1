# 編輯「對照表\*.csv」後，執行本檔即可把新名稱套進工具(魔靈分析工具.html)
$ErrorActionPreference="Stop"
$w="D:\AI用的\魔靈Json分析\work"
Write-Host "[1/2] 套用對照表、產生資料..." -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File "$w\gen_payload.ps1"
Write-Host "[2/2] 重建 HTML..." -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File "$w\build.ps1"
Write-Host "完成! 開啟 魔靈分析工具.html 即可" -ForegroundColor Green
