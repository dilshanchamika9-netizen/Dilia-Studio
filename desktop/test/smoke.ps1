# Installer smoke test on a real Windows machine (GitHub Actions windows runner).
# Installs silently for the current user, checks files and the .pdf registration, opens a PDF by launching the app
# the way File Explorer does, takes a screenshot, then uninstalls. Writes report lines to $env:REPORT.
$ErrorActionPreference = 'Stop'
$fails = 0
function Check($name, $ok, $detail = '') {
  $line = $(if ($ok) { 'PASS ' } else { 'FAIL ' }) + $name + $(if ($detail) { ' : ' + $detail } else { '' })
  Write-Host $line; Add-Content -Path $env:REPORT -Value $line
  if (-not $ok) { $script:fails++ }
}
$setup = Get-ChildItem "$PSScriptRoot\..\dist\Dilia-PDF-Setup-*.exe" | Select-Object -First 1
Check 'installer built' ($null -ne $setup) $setup.Name
$sig = Get-AuthenticodeSignature $setup.FullName
Check 'installer signature status recorded (unsigned expected until the Store)' $true $sig.Status
Start-Process $setup.FullName -ArgumentList '/S' -Wait
$exe = Get-ChildItem "$env:LOCALAPPDATA\Programs" -Recurse -Filter 'DiliaPDF.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
Check 'installed for this user (no admin needed)' ($null -ne $exe) $(if ($exe) { $exe.FullName } else { 'not found' })
$lnk = Test-Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Dilia PDF.lnk"
Check 'Start menu shortcut' $lnk
Check 'Desktop shortcut' (Test-Path "$([Environment]::GetFolderPath('Desktop'))\Dilia PDF.lnk")
$assoc = Get-ChildItem 'HKCU:\Software\Classes' -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -like '*pdf*' -or $_.PSChildName -like 'Dilia*' } | ForEach-Object { $_.PSChildName }
Check '.pdf registered with the app (Open with)' (($assoc -join ',') -match 'pdf') ($assoc -join ', ')
$cmdKey = Get-ChildItem 'HKCU:\Software\Classes' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '\\shell\\open\\command$' } | ForEach-Object { (Get-ItemProperty $_.PSPath).'(default)' } | Where-Object { $_ -match 'DiliaPDF' } | Select-Object -First 1
Check 'open command points at DiliaPDF.exe "%1"' ($cmdKey -match 'DiliaPDF\.exe.*%1') $cmdKey
$uninst = Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' | ForEach-Object { Get-ItemProperty $_.PSPath } | Where-Object { $_.DisplayName -eq 'Dilia PDF' } | Select-Object -First 1
Check 'listed in Settings > Apps (uninstall entry)' ($null -ne $uninst) $(if ($uninst) { $uninst.DisplayVersion } else { '' })

# open a PDF the way a double-click does
$pdf = Join-Path $env:RUNNER_TEMP 'Quarterly report.pdf'
Copy-Item "$PSScriptRoot\fixtures\ten.pdf" $pdf
$p = Start-Process $exe.FullName -ArgumentList "`"$pdf`"" -PassThru
$title = ''
for ($i = 0; $i -lt 40 -and $title -notmatch 'Quarterly report'; $i++) { Start-Sleep -Milliseconds 500; $title = (Get-Process -Name DiliaPDF -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle }
Check 'double-click a PDF: app opens it (window title)' ($title -match 'Quarterly report\.pdf - Dilia PDF') $title
Start-Sleep -Seconds 3
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
[System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$bmp.Save($env:SHOT, [System.Drawing.Imaging.ImageFormat]::Png)
# second double-click goes to the same window
$pdf2 = Join-Path $env:RUNNER_TEMP 'Second.pdf'; Copy-Item $pdf $pdf2
Start-Process $exe.FullName -ArgumentList "`"$pdf2`""
Start-Sleep -Seconds 6
$n = (Get-Process -Name DiliaPDF -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }).Count
Check 'second PDF opens in the same window (one app window)' ($n -eq 1) "windows=$n"
Check 'opened file unchanged (nothing written without Ctrl+S)' ((Get-FileHash $pdf).Hash -eq (Get-FileHash "$PSScriptRoot\fixtures\ten.pdf").Hash)
Get-Process -Name DiliaPDF -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
$un = Get-ChildItem $exe.DirectoryName -Filter 'Uninstall*.exe' | Select-Object -First 1
Start-Process $un.FullName -ArgumentList '/S' -Wait
Start-Sleep -Seconds 5
Check 'uninstalls cleanly' (-not (Test-Path $exe.FullName))
Add-Content -Path $env:REPORT -Value "SHA256 $((Get-FileHash $setup.FullName).Hash)  $($setup.Name)  $([math]::Round($setup.Length / 1MB, 1)) MB"
if ($fails) { exit 1 }
