$nodeZipUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip"
$frontendPath = $PSScriptRoot
$parentPath = Split-Path $PSScriptRoot -Parent
$zipPath = Join-Path $parentPath "node-portable.zip"
$extractPath = Join-Path $parentPath "node-portable"

try {
    # 1. Download portable Node.js
    if (-not (Test-Path $zipPath)) {
        Write-Host "Downloading portable Node.js (approx. 30MB)..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeZipUrl -OutFile $zipPath -UseBasicParsing
    }

    # 2. Extract
    Write-Host "Extracting Node.js..."
    if (Test-Path $extractPath) {
        Remove-Item -Path $extractPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

    # 3. Locate executables
    $nodeDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
    $nodeExe = Join-Path $nodeDir.FullName "node.exe"
    $npmCmd = Join-Path $nodeDir.FullName "npm.cmd"

    # Add portable node to path for sub-processes
    $env:Path = "$($nodeDir.FullName);$env:Path"

    Write-Host "✅ Portable Node.js is ready."
    
    # 4. Navigate to frontend and install
    cd $frontendPath
    Write-Host "Installing frontend dependencies (this takes a moment)..."
    & $npmCmd install --no-audit --no-fund --loglevel=error

    # 5. Build
    Write-Host "Compiling frontend assets..."
    & $npmCmd run build

    Write-Host "✅ Compile completed successfully! Compiled files are located in: C:\Users\Kunal\Downloads\HirenextAI\HirenextAI\frontend\dist"
    
    # Cleanup zip
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "❌ An error occurred during the build process: $_"
}
