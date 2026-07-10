$root="D:\AI用的\魔靈Json分析"
$port=8791
$listener=New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "serving $root on http://localhost:$port"
while($listener.IsListening){
  $ctx=$listener.GetContext()
  $rel=[Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if($rel -eq ''){$rel='魔靈分析工具.html'}
  $path=Join-Path $root $rel
  if(Test-Path $path){
    $bytes=[IO.File]::ReadAllBytes($path)
    if($path -match '\.html?$'){$ctx.Response.ContentType='text/html; charset=utf-8'}
    elseif($path -match '\.json$'){$ctx.Response.ContentType='application/json; charset=utf-8'}
    elseif($path -match '\.png$'){$ctx.Response.ContentType='image/png'}
    elseif($path -match '\.(jpg|jpeg)$'){$ctx.Response.ContentType='image/jpeg'}
    elseif($path -match '\.css$'){$ctx.Response.ContentType='text/css; charset=utf-8'}
    elseif($path -match '\.js$'){$ctx.Response.ContentType='application/javascript; charset=utf-8'}
    $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
  } else {$ctx.Response.StatusCode=404}
  $ctx.Response.Close()
}