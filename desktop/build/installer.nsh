; Dilia PDF uninstaller: remove the app's own data (recent-files list, view and print choices) when the app is removed,
; but not when an update replaces the old version. The user's PDF files are never touched.
!macro customUnInstall
  FileOpen $9 "$TEMP\dilia-uninstall.log" w
  FileWrite $9 "APPDATA=$APPDATA$\r$\nMODE=$installMode$\r$\n"
  ${if} ${isUpdated}
    FileWrite $9 "updated=yes$\r$\n"
  ${else}
    FileWrite $9 "updated=no$\r$\n"
  ${endIf}
  ${ifNot} ${isUpdated}
    ClearErrors
    RMDir /r "$APPDATA\${PRODUCT_FILENAME}"
    ${if} ${Errors}
      FileWrite $9 "rmdir-errors=yes$\r$\n"
    ${else}
      FileWrite $9 "rmdir-errors=no$\r$\n"
    ${endIf}
    FileWrite $9 "product=${PRODUCT_FILENAME}$\r$\n"
  ${endIf}
  FileClose $9
!macroend
