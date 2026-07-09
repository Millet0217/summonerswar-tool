param([string]$src = "D:\AI用的\魔靈Json分析\smw20260710.json",
      [string]$out = "D:\AI用的\魔靈Json分析\work")
$ErrorActionPreference = "Stop"
$d = Get-Content $src -Raw -Encoding UTF8 | ConvertFrom-Json

$effName = @{1='HP';2='HP%';3='ATK';4='ATK%';5='DEF';6='DEF%';8='SPD';9='CRate%';10='CDmg%';11='RES%';12='ACC%'}
$setName = @{1='活力';2='守護';3='迅速';4='刀刃';5='暴擊';6='命中';7='忍耐';8='致命';10='絕望';11='吸血';13='暴怒';14='復仇';15='意志';16='護盾';17='反擊';18='破壞';19='戰意';20='決心';21='強化';22='精準';23='忍受';24='封印'}
$attrName = @{1='水';2='火';3='風';4='光';5='暗'}
$subMax = @{2=40;4=40;6=40;8=30;9=30;10=35;11=40;12=40;1=1875;3=100;5=100}
$mainMax = @{1=2448;2=63;3=160;4=63;5=160;6=63;8=42;9=58;10=80;11=64;12=64}

function Parse-Rune($r, $ownerName){
  $stars=$r.class; $ancient=$false
  if($stars -ge 11){$ancient=$true; $stars=$stars-10}
  $priT=[int]$r.pri_eff[0]; $priV=$r.pri_eff[1]
  $preT=[int]$r.prefix_eff[0]; $preV=$r.prefix_eff[1]
  $mmax=$mainMax[$priT]; if(-not $mmax){$mmax=1}
  $mainRatio= if($r.upgrade_curr -ge 15){1.0}else{[math]::Min(1.0,$priV/$mmax)}
  $subSum=0.0; $subs=@(); $stypes=@()
  if($preT -ne 0){ $mx=$subMax[$preT]; if($mx){$subSum+=$preV/$mx}; $subs+="$($effName[$preT])+$preV(前)"; $stypes+=$preT }
  foreach($s in $r.sec_eff){
    $st=[int]$s[0]; $sv=$s[1]; $grind=if($s.Count -ge 4){$s[3]}else{0}
    $mx=$subMax[$st]; if($mx){$subSum+=($sv+$grind)/$mx}
    $g=if($grind -gt 0){"+$grind磨"}else{""}
    $subs+="$($effName[$st])+$sv$g"; $stypes+=$st
  }
  $eff=[math]::Round(($mainRatio+$subSum)/2.8*100,1)
  [pscustomobject]@{
    rune_id=$r.rune_id; slot=$r.slot_no; stars=$stars; ancient=$ancient
    a=if($ancient){'A'}else{''}
    set_id=[int]$r.set_id; set=$setName[[int]$r.set_id]; quality=$r.rank; level=$r.upgrade_curr
    main="$($effName[$priT])+$priV"; main_type=$priT; main_val=$priV
    prefix=if($preT -ne 0){"$($effName[$preT])+$preV"}else{""}
    subs=($subs -join ' / '); sub_types=($stypes -join ',')
    eff=$eff; equipped=($null -ne $ownerName); owner=$ownerName; sell=$r.sell_value
  }
}

# 全部符文 = 倉庫(未裝) + 各怪身上(已裝)
$allRunes=New-Object System.Collections.ArrayList
foreach($r in $d.runes){ [void]$allRunes.Add((Parse-Rune $r $null)) }

$attrName2=$attrName
$units = foreach($u in $d.unit_list){
  $ru=@($u.runes | ?{$_ -and $_.rune_id})
  $rids=@(); $sets=@{}
  foreach($r in $ru){
    $pr=Parse-Rune $r $u.unit_id
    [void]$allRunes.Add($pr); $rids+=$r.rune_id
    $s=$pr.set; if($s){ if($sets.ContainsKey($s)){$sets[$s]++}else{$sets[$s]=1} }
  }
  $setStr=($sets.GetEnumerator()|Sort Value -Desc|%{"$($_.Key)x$($_.Value)"}) -join ' '
  [pscustomobject]@{
    unit_id=$u.unit_id; master_id=$u.unit_master_id; attribute=$u.attribute; attr=$attrName2[[int]$u.attribute]
    stars=$u.class; level=$u.unit_level; con=$u.con; atk=$u.atk; def=$u.def; spd=$u.spd
    cr=$u.critical_rate; cd=$u.critical_damage; res=$u.resist; acc=$u.accuracy
    rune_count=$ru.Count; rune_sets=$setStr; rune_ids=($rids -join ','); source=$u.source; homunculus=$u.homunculus
  }
}

# 神器: 倉庫 + 身上
function Parse-Art($a,$owner){
  [pscustomobject]@{
    rid=$a.rid; type=$a.type; attribute=$a.attribute; nat_rank=$a.natural_rank; rank=$a.rank; level=$a.level
    pri=($a.pri_effect -join ','); equipped=($null -ne $owner); owner=$owner
  }
}
$allArts=New-Object System.Collections.ArrayList
foreach($a in $d.artifacts){ [void]$allArts.Add((Parse-Art $a $null)) }
foreach($u in $d.unit_list){ foreach($a in @($u.artifacts|?{$_ -and $_.rid})){ [void]$allArts.Add((Parse-Art $a $u.unit_id)) } }

$allRunes | ConvertTo-Json -Depth 4 | Out-File "$out\runes.json" -Encoding UTF8
$units    | ConvertTo-Json -Depth 4 | Out-File "$out\units.json" -Encoding UTF8
$allArts  | ConvertTo-Json -Depth 4 | Out-File "$out\artifacts.json" -Encoding UTF8
$d.unit_list | Group-Object unit_master_id | Select @{n='master_id';e={$_.Name}},Count | ConvertTo-Json | Out-File "$out\master_ids.json" -Encoding UTF8

"UNITS:$($units.Count)  RUNES(全):$($allRunes.Count)  已裝:$(($allRunes|?{$_.equipped}).Count)  倉庫:$(($allRunes|?{-not $_.equipped}).Count)"
"ARTIFACTS(全):$($allArts.Count)  已裝:$(($allArts|?{$_.equipped}).Count)"
"有裝符文的怪:$(($units|?{$_.rune_count-gt0}).Count)"
