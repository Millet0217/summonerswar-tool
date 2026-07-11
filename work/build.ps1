$ErrorActionPreference="Stop"
$w="D:\AI用的\魔靈Json分析\work"
$tpl=[IO.File]::ReadAllText("$w\tool_template.html",[Text.Encoding]::UTF8)
$u=[IO.File]::ReadAllText("$w\p_units.json",[Text.Encoding]::UTF8).Trim()
$r=[IO.File]::ReadAllText("$w\p_runes.json",[Text.Encoding]::UTF8).Trim()
$app=[IO.File]::ReadAllText("$w\app.js",[Text.Encoding]::UTF8)
$imp=[IO.File]::ReadAllText("$w\importer.js",[Text.Encoding]::UTF8)
$db=[IO.File]::ReadAllText("$w\monster_db.json",[Text.Encoding]::UTF8).Trim()
$cat=[IO.File]::ReadAllText("$w\catalog.json",[Text.Encoding]::UTF8).Trim()
$ico=[IO.File]::ReadAllText("$w\icon_map.json",[Text.Encoding]::UTF8).Trim()
$lnk=[IO.File]::ReadAllText("$w\links.json",[Text.Encoding]::UTF8).Trim()
$bs=[IO.File]::ReadAllText("$w\base_stats.json",[Text.Encoding]::UTF8).Trim()

# 怪物中文對照 (代碼→中文)，供匯入新JSON時套用中文名
$zh=@{}
foreach($row in (Import-Csv "D:\AI用的\魔靈Json分析\對照表\怪物.csv" -Encoding UTF8)){
  if($row.中文 -and $row.中文.Trim()){ $zh["$($row.代碼)"]=$row.中文.Trim() }
}
$zhJson=($zh|ConvertTo-Json -Compress); if(-not $zhJson){ $zhJson='{}' }

$tpl=$tpl.Replace('/*UNITS_DATA*/[]/*END*/',$u)
$tpl=$tpl.Replace('/*RUNES_DATA*/[]/*END*/',$r)
$tpl=$tpl.Replace('/*MONSTER_DB*/{}/*END*/',$db)
$tpl=$tpl.Replace('/*CATALOG*/[]/*END*/',$cat)
$tpl=$tpl.Replace('/*ICONS*/{}/*END*/',$ico)
$tpl=$tpl.Replace('/*LINKS*/{}/*END*/',$lnk)
$tpl=$tpl.Replace('/*BASE_STATS*/{}/*END*/',$bs)
$tpl=$tpl.Replace('/*ZH_NAMES*/{}/*END*/',$zhJson)
$tpl=$tpl.Replace('/*IMPORTER_JS*/',$imp)
$tpl=$tpl.Replace('/*APP_JS*/',$app)
$dest="D:\AI用的\魔靈Json分析\魔靈分析工具.html"
[IO.File]::WriteAllText($dest,$tpl,(New-Object Text.UTF8Encoding($true)))
"OK size=$([math]::Round((Get-Item $dest).Length/1kb))KB"