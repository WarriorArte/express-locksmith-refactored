$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $repoRoot "backend"
$winScpPath = Join-Path $env:LOCALAPPDATA "Programs\WinSCP\WinSCP.com"

$ftpHost = "195.179.237.229"
$ftpPort = 21
$ftpUser = "u589779639.joshiwarrior"
$remotePath = "/"

if (-not (Test-Path $backendPath -PathType Container)) {
    throw "No se encontro la carpeta backend en: $backendPath"
}

if (-not (Test-Path $winScpPath -PathType Leaf)) {
    throw "No se encontro WinSCP en: $winScpPath"
}

$password = Read-Host "FTP password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $sessionUrl = "ftp://$($ftpUser):$($plainPassword)@$($ftpHost):$($ftpPort)/"
    $scriptPath = Join-Path ([System.IO.Path]::GetTempPath()) ("winscp-deploy-backend-{0}.txt" -f ([guid]::NewGuid()))

    $winScpCommands = @(
        "option batch abort"
        "option confirm off"
        "open `"$sessionUrl`""
        "synchronize remote `"$backendPath`" `"$remotePath`" -filemask=`"| .env; vendor/; storage/logs/; bootstrap/cache/*.php; public/uploads/`""
        "exit"
    )

    Set-Content -Path $scriptPath -Value $winScpCommands -Encoding ASCII

    & $winScpPath /script="$scriptPath"

    if ($LASTEXITCODE -ne 0) {
        throw "WinSCP termino con codigo de salida $LASTEXITCODE"
    }
}
finally {
    if ($scriptPath -and (Test-Path $scriptPath)) {
        Remove-Item $scriptPath -Force
    }

    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}
