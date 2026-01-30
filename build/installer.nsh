!macro customInstall
  ; Adiciona informações ao registro do Windows
  WriteRegStr HKCU "Software\Noroeste JW" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\Noroeste JW" "Version" "${VERSION}"
  
  ; Cria atalho na área de trabalho
  CreateShortCut "$DESKTOP\Noroeste JW.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\${PRODUCT_FILENAME}.exe" 0
  
  ; Mensagem de sucesso
  MessageBox MB_OK "Instalação concluída com sucesso!$\n$\nO Noroeste JW foi instalado em:$\n$INSTDIR"
!macroend

!macro customUnInstall
  ; Remove chaves do registro
  DeleteRegKey HKCU "Software\Noroeste JW"
  
  ; Remove atalho da área de trabalho
  Delete "$DESKTOP\Noroeste JW.lnk"
!macroend
