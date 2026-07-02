# Перекодирование hero-видео в 1080p (нужен ffmpeg в PATH)
# Установка: winget install Gyan.FFmpeg
# Запуск из папки сайта: powershell -File scripts/reencode-hero-video.ps1

$ErrorActionPreference = 'Stop'
$src = 'F:\Загрузки\17765073160891.mp4'
$out = Join-Path $PSScriptRoot '..\public\videos\hero-bg.mp4'
$tmp = Join-Path $PSScriptRoot '..\public\videos\hero-bg-new.mp4'

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host 'ffmpeg не найден. Установите: winget install Gyan.FFmpeg' -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path $src)) {
  Write-Host "Исходник не найден: $src" -ForegroundColor Yellow
  exit 1
}

Write-Host 'Перекодирование в 1080p, высокое качество...'
ffmpeg -y -i $src `
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,unsharp=5:5:0.6:5:5:0.3" `
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p `
  -movflags +faststart -an $tmp

Move-Item -Force $tmp $out
Write-Host "Готово: $out" -ForegroundColor Green
