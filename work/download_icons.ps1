$ErrorActionPreference="Continue"
$root=Split-Path $PSScriptRoot
$dir=Join-Path $root "icons"
New-Item -ItemType Directory -Force $dir | Out-Null
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$list=Get-Content (Join-Path $PSScriptRoot "icon_list.txt")
$wc=New-Object Net.WebClient
$base="https://swarfarm.com/static/herders/images/monsters/"
$ok=0;$skip=0;$fail=0;$i=0
foreach($img in $list){
  $i++
  $dest=Join-Path $dir $img
  if(Test-Path $dest){ $skip++; continue }
  try{ $wc.DownloadFile($base+$img,$dest); $ok++ }
  catch{ $fail++; Write-Host "FAIL $img : $($_.Exception.Message)" }
  if($i % 200 -eq 0){ Write-Host "$i/$($list.Count)  ok=$ok skip=$skip fail=$fail" }
}
Write-Host "DONE total=$($list.Count) ok=$ok skip=$skip fail=$fail"
