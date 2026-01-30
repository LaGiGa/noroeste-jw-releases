# Script para criar um instalador portátil do Noroeste JW
# Este script cria um arquivo ZIP auto-extraível

$appName = "Noroeste JW"
$version = "1.0.0"
$sourceDir = "dist-electron\win-unpacked"
$outputDir = "dist-electron"
$zipName = "$appName-Setup-$version.zip"

Write-Host "Criando instalador portátil para $appName v$version..." -ForegroundColor Green

# Verifica se a pasta source existe
if (-not (Test-Path $sourceDir)) {
    Write-Host "Erro: Pasta $sourceDir não encontrada!" -ForegroundColor Red
    exit 1
}

# Cria o arquivo ZIP
Write-Host "Compactando arquivos..." -ForegroundColor Yellow
$zipPath = Join-Path $outputDir $zipName

# Remove ZIP anterior se existir
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Cria o ZIP
Compress-Archive -Path "$sourceDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "`nInstalador criado com sucesso!" -ForegroundColor Green
Write-Host "Localização: $zipPath" -ForegroundColor Cyan
Write-Host "`nInstruções de instalação:" -ForegroundColor Yellow
Write-Host "1. Extraia o conteúdo do arquivo ZIP para uma pasta de sua escolha"
Write-Host "2. Execute o arquivo 'Noroeste JW.exe'"
Write-Host "`nTamanho do arquivo: $((Get-Item $zipPath).Length / 1MB) MB" -ForegroundColor Cyan
