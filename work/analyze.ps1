$ErrorActionPreference="Stop"
$out="D:\AI用的\魔靈Json分析\work"
$units=Get-Content "$out\units.json" -Raw -Encoding UTF8|ConvertFrom-Json
$runes=Get-Content "$out\runes.json" -Raw -Encoding UTF8|ConvertFrom-Json
$arts =Get-Content "$out\artifacts.json" -Raw -Encoding UTF8|ConvertFrom-Json
$db=Get-Content "$out\monster_db.json" -Raw -Encoding UTF8|ConvertFrom-Json

$byId=@{}
foreach($u in $units){
  $m=$db."$($u.master_id)"
  if($m){$nm=$m.name;$ar=$m.arch;$ns=$m.stars}else{$nm="?$($u.master_id)";$ar='?';$ns=0}
  $u|Add-Member name $nm -Force
  $u|Add-Member arch $ar -Force
  $u|Add-Member nat_stars $ns -Force
  $byId["$($u.unit_id)"]=$u
}
foreach($r in $runes){ if($r.owner){ $o=$byId["$($r.owner)"]; if($o){$r|Add-Member owner_name $o.name -Force} } }
$units|ConvertTo-Json -Depth 4|Out-File "$out\units_named.json" -Encoding UTF8
$runes|ConvertTo-Json -Depth 4|Out-File "$out\runes_named.json" -Encoding UTF8

"=== 怪物總覽 ==="
"6★:$(($units|?{$_.stars-eq6}).Count)  5★:$(($units|?{$_.stars-eq5}).Count)  4★以下:$(($units|?{$_.stars-lt5}).Count)"
"`n6★職業分佈:"; $units|?{$_.stars-eq6}|Group-Object arch|Sort Count -Desc|%{"  {0,-10}{1}" -f $_.Name,$_.Count}
"`n天生星數(全部怪):"; $units|Group-Object nat_stars|Sort Name|%{"  天生$($_.Name)★: $($_.Count)"}

"`n=== 符文總覽 ==="
"6★:$(($runes|?{$_.stars-eq6}).Count)  含上古:$(($runes|?{$_.ancient}).Count)"
"平均效率(6★): $([math]::Round((($runes|?{$_.stars-eq6}|Measure eff -Average).Average),1))%"
"效率分級(6★): 90+:$(($runes|?{$_.stars-eq6-and$_.eff-ge90}).Count)  80-90:$(($runes|?{$_.stars-eq6-and$_.eff-ge80-and$_.eff-lt90}).Count)  70-80:$(($runes|?{$_.stars-eq6-and$_.eff-ge70-and$_.eff-lt80}).Count)  <70:$(($runes|?{$_.stars-eq6-and$_.eff-lt70}).Count)"
"`n套裝分佈(6★):"; $runes|?{$_.stars-eq6}|Group-Object set|Sort Count -Desc|%{"  {0,-6}{1}" -f $_.Name,$_.Count}

"`n=== 高分符文 TOP20 ==="
$runes|Sort eff -Desc|Select -First 20|%{
 $ow=if($_.owner_name){$_.owner_name}else{'倉庫'}
 "  {0,5}% {1}{2}★ s{3} {4,-5} {5,-9} | {6,-40} [{7}]" -f $_.eff,$_.a,$_.stars,$_.slot,$_.set,$_.main,$_.subs,$ow }

"`n=== 各slot 倉庫最佳(未裝) ==="
1..6|%{ $sl=$_; $best=$runes|?{-not $_.equipped -and $_.slot-eq$sl}|Sort eff -Desc|Select -First 1
 if($best){"  slot${sl}: {0,5}% {1,-5} {2,-9} | {3}" -f $best.eff,$best.set,$best.main,$best.subs} }

"`n=== 速度主符文(slot2 SPD) ==="
$spd=$runes|?{$_.main_type-eq8}
"  總數:$($spd.Count)  未裝:$(($spd|?{-not $_.equipped}).Count)"
$spd|Sort eff -Desc|Select -First 10|%{ $ow=if($_.owner_name){$_.owner_name}else{'倉庫'}
 "  {0,5}% {1}★ {2,-5} {3} | {4,-35}[{5}]" -f $_.eff,$_.stars,$_.set,$_.main,$_.subs,$ow }
