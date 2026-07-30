# Crea un acceso directo a Panel.bat en el escritorio.
# Correr una sola vez, con doble clic derecho > "Ejecutar con PowerShell",
# o desde la terminal:  powershell -ExecutionPolicy Bypass -File Crear-Acceso-Directo.ps1

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$bat = Join-Path $raiz 'Panel.bat'
$escritorio = [Environment]::GetFolderPath('Desktop')
$destino = Join-Path $escritorio 'Panel.lnk'

if (-not (Test-Path $bat)) { throw "No se encontro Panel.bat en $raiz" }

$shell = New-Object -ComObject WScript.Shell
$acceso = $shell.CreateShortcut($destino)
$acceso.TargetPath = $bat
$acceso.WorkingDirectory = $raiz
$acceso.Description = 'Panel local de proyectos y boveda'
$acceso.WindowStyle = 7   # minimizado: la consola no molesta
$acceso.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
$acceso.Save()

Write-Output "Acceso directo creado en: $destino"
