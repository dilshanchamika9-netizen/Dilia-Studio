; Dilia PDF uninstaller: remove the app's own data (recent-files list, view and print choices) when the app is removed,
; but not when an update replaces the old version. The user's PDF files are never touched.
; The data folder is named after the product name with its space ("Dilia PDF"); electron-builder's own option looks for "DiliaPDF".
!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$APPDATA\Dilia PDF"
  ${endIf}
!macroend
