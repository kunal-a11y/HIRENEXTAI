$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localDir = Join-Path $projectRoot '.local'
$nodePath = (Get-Command node.exe).Source

function Test-LocalPort([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try { $client.Connect('127.0.0.1', $Port); return $true }
    catch { return $false }
    finally { $client.Dispose() }
}

function Start-ProjectProcess($Name, $Executable, $Arguments, $WorkingDirectory, $Port) {
    if (Test-LocalPort $Port) {
        Write-Host "$Name already has a listener on port $Port."
        return
    }
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDir "$Name.stdout.log") -RedirectStandardError (Join-Path $localDir "$Name.stderr.log")
    $process.Id | Set-Content (Join-Path $localDir "$Name.pid")
    @{ pid = $process.Id; started = $process.StartTime.ToUniversalTime().ToString('o'); executable = $Executable } | ConvertTo-Json | Set-Content (Join-Path $localDir "$Name.process.json")
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if (Test-LocalPort $Port) { Write-Host "$Name ready on 127.0.0.1:$Port"; return }
        $process.Refresh()
        if ($process.HasExited) { throw "$Name exited. See .local/$Name.stderr.log" }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name did not become ready. See .local/$Name.stderr.log"
}

$dbExe = Join-Path $localDir 'mariadb-11.8.6-winx64/bin/mariadbd.exe'
$dbConfig = Join-Path $localDir 'mysql-data/my.ini'
if (!(Test-Path $dbExe) -or !(Test-Path $dbConfig) -or !(Test-Path (Join-Path $projectRoot 'backend/.env'))) {
    throw 'Local database setup is missing. See LOCAL_DEVELOPMENT.md.'
}
Start-ProjectProcess 'database' $dbExe ('--defaults-file="' + $dbConfig + '"') $projectRoot 3307
Start-ProjectProcess 'backend' $nodePath ('"' + (Join-Path $projectRoot 'backend/server.js') + '"') (Join-Path $projectRoot 'backend') 5000
Start-ProjectProcess 'frontend' $nodePath ('"' + (Join-Path $projectRoot 'frontend/node_modules/vite/bin/vite.js') + '"') (Join-Path $projectRoot 'frontend') 3003
Write-Host 'HirenextAI: http://localhost:3003'
