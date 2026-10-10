param([ValidateSet('frontend', 'backend', 'database')][string[]]$Service = @('frontend', 'backend', 'database'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
foreach ($name in $Service) {
    $recordPath = Join-Path $projectRoot ".local/$name.process.json"
    if (!(Test-Path -LiteralPath $recordPath)) { continue }
    $record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
    $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if (!$process) { continue }
    $savedStart = ([datetime]$record.started).ToUniversalTime()
    if ($process.Path -ne $record.executable -or $process.StartTime.ToUniversalTime().Ticks -ne $savedStart.Ticks) {
        throw "The saved $name process identity no longer matches. Nothing was stopped."
    }
    if ($name -eq 'database') {
        & node (Join-Path $PSScriptRoot 'shutdown-database.cjs')
        if ($LASTEXITCODE -ne 0) { throw 'Database shutdown failed. The process was not forcibly stopped.' }
    } else {
        Stop-Process -Id $process.Id
    }
    Write-Host "Stopped $name. Local database files are preserved."
}
