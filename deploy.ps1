# deploy.ps1 — one-command deploy of the static site to your server.
#
# What it does:
#   1. Copies every top-level *.html page + the js/css/assets/templates folders
#      to the server's web root via scp.
#   2. Fixes permissions over ssh so nginx (www-data) can read everything
#      (scp can land new folders as 0700, which makes nginx 404 the files).
#
# Usage (from the project folder):
#   .\deploy.ps1 -Server root@1.2.3.4
#
# Or set the host once per terminal, then just run .\deploy.ps1:
#   $env:AWARENESS_DEPLOY_HOST = "root@1.2.3.4"
#   .\deploy.ps1
#
# If PowerShell blocks the script ("running scripts is disabled"), run it as:
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Server root@1.2.3.4

param(
  [string]$Server  = $env:AWARENESS_DEPLOY_HOST,
  [string]$WebRoot = "/var/www/awareness"
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot   # always run from the project root

if (-not $Server) {
  Write-Host "No server specified." -ForegroundColor Red
  Write-Host "  Run:  .\deploy.ps1 -Server root@<IP>"
  Write-Host "  Or:   `$env:AWARENESS_DEPLOY_HOST = 'root@<IP>'   (then just .\deploy.ps1)"
  exit 1
}

# Collect what ships: every top-level .html page + the asset dirs that exist.
$pages = Get-ChildItem -File -Filter *.html | Select-Object -ExpandProperty Name
$dirs  = @("js", "css", "assets", "templates") | Where-Object { Test-Path $_ -PathType Container }
$sources = @($pages) + @($dirs)

if ($sources.Count -eq 0) {
  Write-Host "Nothing to deploy from $PSScriptRoot — are you in the project folder?" -ForegroundColor Red
  exit 1
}

Write-Host "Deploying to ${Server}:${WebRoot}" -ForegroundColor Cyan
Write-Host ("  pages : {0}" -f ($pages -join ", "))
Write-Host ("  dirs  : {0}" -f ($dirs  -join ", "))

# 1) copy files
scp -r -o ServerAliveInterval=60 $sources "${Server}:${WebRoot}/"
if ($LASTEXITCODE -ne 0) {
  Write-Host "scp failed (exit $LASTEXITCODE). Nothing further run." -ForegroundColor Red
  exit $LASTEXITCODE
}

# 2) fix permissions so nginx can read the new files/folders
ssh -o ServerAliveInterval=60 $Server "chmod -R a+rX '$WebRoot'"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Files copied, but the chmod over ssh failed (exit $LASTEXITCODE)." -ForegroundColor Yellow
  Write-Host "Run manually:  ssh $Server `"chmod -R a+rX $WebRoot`""
  exit $LASTEXITCODE
}

Write-Host "Done. Hard-refresh the browser (Ctrl+Shift+R)." -ForegroundColor Green
