$ErrorActionPreference="Stop"
$out=$PSScriptRoot
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
# PS5.1 Invoke-RestMethod 無 charset 時以 Latin-1 解碼 → 韓文/重音亂碼；改用 WebClient 強制 UTF-8
$wc=New-Object Net.WebClient
$wc.Encoding=[Text.Encoding]::UTF8
$all=@()
$url="https://swarfarm.com/api/v2/monsters/?limit=100"
$page=0
while($url){
  $page++
  $r=$wc.DownloadString($url)|ConvertFrom-Json
  foreach($m in $r.results){
    $all+=[pscustomobject]@{
      id=$m.id; mid=$m.com2us_id; name=$m.name; img=$m.image_filename
      element=$m.element; arch=$m.archetype; ns=$m.natural_stars
      aw=$m.awaken_level; obtainable=$m.obtainable; family=$m.family_id
      awto=$m.awakens_to; awfrom=$m.awakens_from; tfto=$m.transforms_to
      hp=$m.max_lvl_hp; atk=$m.max_lvl_attack; def=$m.max_lvl_defense; spd=$m.speed
      cr=$m.crit_rate; cd=$m.crit_damage; res=$m.resistance; acc=$m.accuracy
      hp1=$m.base_hp; atk1=$m.base_attack; def1=$m.base_defense
      src=(($m.source|%{$_.name}) -join ' / ')
    }
  }
  Write-Host "page $page  total $($all.Count)/$($r.count)"
  $url=$r.next
}
($all|ConvertTo-Json -Compress -Depth 4)|Out-File (Join-Path $out "swarfarm_all.json") -Encoding UTF8
"DONE $($all.Count) monsters"
