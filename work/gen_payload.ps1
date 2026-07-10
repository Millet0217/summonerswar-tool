$ErrorActionPreference="Stop"
$root="D:\AI用的\魔靈Json分析"; $out="$root\work"
$units=Get-Content "$out\units_named.json" -Raw -Encoding UTF8|ConvertFrom-Json
$runes=Get-Content "$out\runes_named.json" -Raw -Encoding UTF8|ConvertFrom-Json

# ---- 讀對照檔 (中文空→退回英文) ----
function LoadCsv($p){ Import-Csv $p -Encoding UTF8 }
$mMon=@{}   # master_id -> 中文
foreach($r in LoadCsv "$root\對照表\怪物.csv"){ if($r.中文 -and $r.中文.Trim()){$mMon["$($r.代碼)"]=$r.中文.Trim()} }
$mSet=@{}   # set_id -> 中文(或英文)
foreach($r in LoadCsv "$root\對照表\符文.csv"){ if($r.類別 -eq '套裝'){ $zh=if($r.中文 -and $r.中文.Trim()){$r.中文.Trim()}else{$r.英文}; $mSet["$($r.代碼)"]=$zh } }

# ---- units ----
$idDisp=@{}
foreach($u in $units){
  $mid="$($u.master_id)"
  $en=$u.name
  $disp=if($mMon.ContainsKey($mid)){$mMon[$mid]}else{$en}
  $u|Add-Member disp $disp -Force; $u|Add-Member en $en -Force
  $idDisp["$($u.unit_id)"]=$disp
}
# rune 顯示套裝 + owner顯示 + 重算每隻的套裝字串
$runeSetDisp=@{}
foreach($r in $runes){
  $sd=if($mSet.ContainsKey("$($r.set_id)")){$mSet["$($r.set_id)"]}else{$r.set}
  $r|Add-Member setDisp $sd -Force
  $runeSetDisp["$($r.rune_id)"]=$sd
}
$U=foreach($u in $units){
  # 重算目前套裝字串(用顯示名)
  $cnt=@{}
  foreach($rid in ($u.rune_ids -split ',')){ if($rid -and $runeSetDisp.ContainsKey($rid)){ $s=$runeSetDisp[$rid]; if($cnt.ContainsKey($s)){$cnt[$s]++}else{$cnt[$s]=1} } }
  $rs=($cnt.GetEnumerator()|Sort Value -Desc|%{"$($_.Key)x$($_.Value)"}) -join ' '
  [pscustomobject]@{ id="$($u.unit_id)"; mid="$($u.master_id)"; n=$u.disp; en=$u.en; at=$u.attr; s=$u.stars; ns=$u.nat_stars; ar=$u.arch
    lv=$u.level; con=$u.con; atk=$u.atk; def=$u.def; spd=$u.spd; cr=$u.cr; cd=$u.cd; re=$u.res; ac=$u.acc
    rc=$u.rune_count; rs=$rs; ri=$u.rune_ids }
}
$R=foreach($r in $runes){
  $ow=if($r.owner){ $idDisp["$($r.owner)"] }else{''}
  [pscustomobject]@{ id="$($r.rune_id)"; sl=$r.slot; st=$r.stars; anc=[int]$r.ancient; set=$r.setDisp; sid=$r.set_id
    q=$r.quality; lv=$r.level; m=$r.main; mt=$r.main_type; mv=$r.main_val; pf=$r.prefix
    sub=$r.subs; sty=$r.sub_types; ef=$r.eff; eq=[int]$r.equipped; ow=$ow }
}
($U|ConvertTo-Json -Compress -Depth 4)|Out-File "$out\p_units.json" -Encoding UTF8
($R|ConvertTo-Json -Compress -Depth 4)|Out-File "$out\p_runes.json" -Encoding UTF8
$named=($U|?{$_.n -ne $_.en}).Count
"units $($U.Count) (已套用中文名 $named)  runes $($R.Count)"
