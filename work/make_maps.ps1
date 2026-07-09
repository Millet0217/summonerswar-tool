$ErrorActionPreference="Stop"
$root="D:\AI用的\魔靈Json分析"
$out="$root\對照表"
New-Item -ItemType Directory -Force $out | Out-Null
$bom=New-Object System.Text.UTF8Encoding($true)
function WriteCsv($path,$lines){ [IO.File]::WriteAllText($path,($lines -join "`r`n")+"`r`n",$bom) }

$units=Get-Content "$root\work\units_named.json" -Raw -Encoding UTF8|ConvertFrom-Json
$db=Get-Content "$root\work\monster_db.json" -Raw -Encoding UTF8|ConvertFrom-Json

# ---- 怪物.csv (中文留空) ----
$seen=@{}; $rows=@()
foreach($u in $units){
  $mid="$($u.master_id)"; if($seen.ContainsKey($mid)){continue}; $seen[$mid]=1
  $m=$db.$mid; $en=if($m){$m.name}else{"?$mid"}
  $rows+=[pscustomobject]@{代碼=$mid;英文=$en;中文=''}
}
$rows=$rows|Sort-Object 英文
$lines=@('代碼,英文,中文')+($rows|%{ '{0},{1},{2}' -f $_.代碼,($_.英文 -replace ',','，'),$_.中文 })
WriteCsv "$out\怪物.csv" $lines
"怪物.csv: $($rows.Count) 筆 (中文留空)"

# ---- 符文.csv (中文預填官方繁中) ----
$setMap=@(
 '1,Energy,活力','2,Guard,守護','3,Swift,迅速','4,Blade,刀刃','5,Rage,暴擊',
 '6,Focus,命中','7,Endure,忍耐','8,Fatal,致命','10,Despair,絕望','11,Vampire,吸血',
 '13,Violent,暴怒','14,Nemesis,復仇','15,Will,意志','16,Shield,護盾','17,Revenge,反擊',
 '18,Destroy,破壞','19,Fight,戰意','20,Determination,決心','21,Enhance,強化','22,Accuracy,精準',
 '23,Tolerance,忍受','24,Seal,封印','25,Intangible,','99,Immemorial,無形')
$effMap=@(
 '1,HP,體力','2,HP%,體力%','3,ATK,攻擊力','4,ATK%,攻擊力%','5,DEF,防禦力','6,DEF%,防禦力%',
 '8,SPD,攻擊速度','9,Critical Rate%,暴擊率%','10,Critical Damage%,暴擊傷害%',
 '11,Resistance%,效果抵抗%','12,Accuracy%,效果命中%')
$qMap=@('1,Common,普通','2,Magic,魔法','3,Rare,稀有','4,Hero,英雄','5,Legend,傳說',
 '11,Ancient Common,上古普通','12,Ancient Magic,上古魔法','13,Ancient Rare,上古稀有','14,Ancient Hero,上古英雄','15,Ancient Legend,上古傳說')
$lines=@('類別,代碼,英文,中文')
$setMap|%{$p=$_ -split ',';$lines+="套裝,$($p[0]),$($p[1]),$($p[2])"}
$effMap|%{$p=$_ -split ',';$lines+="屬性,$($p[0]),$($p[1]),$($p[2])"}
$qMap|%{$p=$_ -split ',';$lines+="品質,$($p[0]),$($p[1]),$($p[2])"}
WriteCsv "$out\符文.csv" $lines
"符文.csv: 套裝24 + 屬性11 + 品質10"

# ---- 魔礦.csv (rune_craft_item 類型;其餘套裝/屬性/品質沿用符文.csv) ----
$ctMap=@(
 '1,Grindstone,磨刀石','2,Enchant Gem,附魔寶石',
 '3,Immemorial Grindstone,無形磨刀石','4,Immemorial Enchant Gem,無形附魔寶石',
 '5,Grindstone,磨刀石','6,Enchant Gem,附魔寶石')
$lines=@('類別,代碼,英文,中文,備註')
$ctMap|%{$p=$_ -split ',';$lines+="類型,$($p[0]),$($p[1]),$($p[2]),craft_type"}
$lines+=',,,,魔礦完整名稱 = 品質 + 套裝 + 屬性 + 類型；套裝/屬性/品質請沿用「符文.csv」的中文'
WriteCsv "$out\魔礦.csv" $lines
"魔礦.csv: 類型6 (套裝/屬性/品質沿用符文.csv)"
