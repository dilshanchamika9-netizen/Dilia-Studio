; Dilia PDF uninstaller: remove the app's own data (recent-files list, view and print choices) when the app is removed.
; Not when an update replaces the old version. The user's PDF files are never touched.
; (electron-builder's deleteAppDataOnUninstall option applies to one-click installers only; this installer is not one-click.)
!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$APPDATA\${PRODUCT_FILENAME}"
    RMDir /r "$APPDATA\${APP_FILENAME}"
  ${endIf}
!macroend
