# Script para criar o executável do Noroeste JW
# Execute este script no PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Noroeste JW - Build do Executável" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o build existe
if (-not (Test-Path "dist\index.html")) {
    Write-Host "❌ Build não encontrado! Executando npm run build..." -ForegroundColor Red
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao fazer o build!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Build encontrado!" -ForegroundColor Green
Write-Host ""

# Opção 1: Tentar com electron-builder
Write-Host "📦 Tentando criar executável com electron-builder..." -ForegroundColor Yellow
npx electron-builder --dir

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Executável criado com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Localização: dist-electron\win-unpacked\Noroeste JW.exe" -ForegroundColor Cyan
    Write-Host ""
    
    # Perguntar se quer abrir o executável
    $resposta = Read-Host "Deseja abrir o executável agora? (S/N)"
    if ($resposta -eq "S" -or $resposta -eq "s") {
        Start-Process "dist-electron\win-unpacked\Noroeste JW.exe"
    }
} else {
    Write-Host ""
    Write-Host "⚠️ electron-builder falhou. Tentando método alternativo..." -ForegroundColor Yellow
    Write-Host ""
    
    # Opção 2: Usar electron-packager
    Write-Host "📦 Instalando electron-packager..." -ForegroundColor Yellow
    npm install -g electron-packager
    
    Write-Host "📦 Criando executável com electron-packager..." -ForegroundColor Yellow
    electron-packager . "Noroeste JW" --platform=win32 --arch=x64 --out=dist-electron --overwrite
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ Executável criado com sucesso!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Localização: dist-electron\Noroeste JW-win32-x64\Noroeste JW.exe" -ForegroundColor Cyan
        Write-Host ""
        
        # Perguntar se quer abrir o executável
        $resposta = Read-Host "Deseja abrir o executável agora? (S/N)"
        if ($resposta -eq "S" -or $resposta -eq "s") {
            Start-Process "dist-electron\Noroeste JW-win32-x64\Noroeste JW.exe"
        }
    } else {
        Write-Host ""
        Write-Host "❌ Não foi possível criar o executável automaticamente." -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Você pode testar a aplicação com:" -ForegroundColor Yellow
        Write-Host "   npx electron ." -ForegroundColor Cyan
        Write-Host ""
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📝 Informações Úteis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Usuário padrão: admin" -ForegroundColor White
Write-Host "Senha padrão: 123" -ForegroundColor White
Write-Host ""
