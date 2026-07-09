$ErrorActionPreference="Stop"
$w="D:\AI用的\魔靈Json分析\work"
$tpl=[IO.File]::ReadAllText("$w\tool_template.html",[Text.Encoding]::UTF8)
$u=[IO.File]::ReadAllText("$w\p_units.json",[Text.Encoding]::UTF8).Trim()
$r=[IO.File]::ReadAllText("$w\p_runes.json",[Text.Encoding]::UTF8).Trim()
$app=[IO.File]::ReadAllText("$w\app.js",[Text.Encoding]::UTF8)
$tpl=$tpl.Replace('/*UNITS_DATA*/[]/*END*/',$u)
$tpl=$tpl.Replace('/*RUNES_DATA*/[]/*END*/',$r)
$tpl=$tpl.Replace('/*APP_JS*/',$app)
$dest="D:\AI用的\魔靈Json分析\魔靈分析工具.html"
[IO.File]::WriteAllText($dest,$tpl,(New-Object Text.UTF8Encoding($true)))
"OK size=$([math]::Round((Get-Item $dest).Length/1kb))KB"