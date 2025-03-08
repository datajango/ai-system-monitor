# PythonCollector.ps1
# Collects information about Python installations and environments

function Get-PythonData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting Python installations data..." -ForegroundColor Yellow
    
    $pythonData = @{
        Installations = @()
        VirtualEnvironments = @()
        PyenvInstallation = $null
        CondaInstallation = $null
    }
    
    # Find Python installations
    try {
        # Check common Python installation locations
        $commonPaths = @(
            "C:\Python*",
            "C:\Program Files\Python*",
            "C:\Program Files (x86)\Python*",
            "C:\Users\$env:USERNAME\AppData\Local\Programs\Python*",
            "C:\ProgramData\Anaconda*",
            "C:\Users\$env:USERNAME\Anaconda*",
            "C:\Users\$env:USERNAME\Miniconda*"
        )
        
        $foundInstallations = @()
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $found = Get-Item $path
                foreach ($item in $found) {
                    $pythonExe = Join-Path $item.FullName "python.exe"
                    if (Test-Path $pythonExe) {
                        $version = "Unknown"
                        try {
                            $versionOutput = & $pythonExe "-V" 2>&1
                            if ($versionOutput -match "Python (\d+\.\d+\.\d+)") {
                                $version = $matches[1]
                            }
                        } catch {}
                        
                        $foundInstallations += @{
                            Path = $item.FullName
                            Version = $version
                            Executable = $pythonExe
                        }
                    }
                }
            }
        }
        
        # Search for python.exe in PATH
        $pathLocations = $env:PATH -split ";" | Where-Object { $_ -ne "" }
        foreach ($location in $pathLocations) {
            $pythonExe = Join-Path $location "python.exe"
            if (Test-Path $pythonExe -ErrorAction SilentlyContinue) {
                $version = "Unknown"
                try {
                    $versionOutput = & $pythonExe "-V" 2>&1
                    if ($versionOutput -match "Python (\d+\.\d+\.\d+)") {
                        $version = $matches[1]
                    }
                } catch {}
                
                # Check if this path is already included
                $alreadyIncluded = $false
                foreach ($install in $foundInstallations) {
                    if ($install.Executable -eq $pythonExe) {
                        $alreadyIncluded = $true
                        break
                    }
                }
                
                if (-not $alreadyIncluded) {
                    $foundInstallations += @{
                        Path = (Split-Path -Parent $pythonExe)
                        Version = $version
                        Executable = $pythonExe
                    }
                }
            }
        }
        
        $pythonData.Installations = $foundInstallations
    } catch {
        $pythonData.Installations = "Unable to collect Python installations"
    }
    
    # Check for pyenv
    try {
        $pyenvPath = "$env:USERPROFILE\.pyenv"
        $pyenvWinPath = "$env:USERPROFILE\.pyenv-win"
        
        if (Test-Path $pyenvPath) {
            $pythonData.PyenvInstallation = @{
                Path = $pyenvPath
                Version = "Installed"
                Type = "Standard pyenv"
            }
        } elseif (Test-Path $pyenvWinPath) {
            $pythonData.PyenvInstallation = @{
                Path = $pyenvWinPath
                Version = "Installed"
                Type = "pyenv-win"
            }
        } else {
            $pythonData.PyenvInstallation = $null
        }
    } catch {
        $pythonData.PyenvInstallation = "Unable to check for pyenv"
    }
    
    # Check for conda
    try {
        $condaCommand = Get-Command conda -ErrorAction SilentlyContinue
        
        if ($condaCommand) {
            $condaInfo = & conda info --json 2>$null
            
            if ($condaInfo) {
                $condaJson = $condaInfo | ConvertFrom-Json
                
                $pythonData.CondaInstallation = @{
                    Path = $condaJson.root_prefix
                    Version = $condaJson.conda_version
                    Environments = @($condaJson.envs)
                }
            } else {
                $pythonData.CondaInstallation = @{
                    Path = $condaCommand.Source
                    Version = "Unknown"
                    Environments = @()
                }
            }
        } else {
            $pythonData.CondaInstallation = $null
        }
    } catch {
        $pythonData.CondaInstallation = "Unable to check for conda"
    }
    
    # Find virtual environments
    try {
        # Common venv locations
        $venvLocations = @(
            "$env:USERPROFILE\*env",
            "$env:USERPROFILE\*venv*",
            "$env:USERPROFILE\.virtualenvs",
            (Get-Location).Path + "\*env",
            (Get-Location).Path + "\*venv*"
        )
        
        $foundVenvs = @()
        
        foreach ($location in $venvLocations) {
            if (Test-Path $location) {
                Get-ChildItem -Path $location -Directory | ForEach-Object {
                    $venvActivate = Join-Path $_.FullName "Scripts\activate.bat"
                    $venvPython = Join-Path $_.FullName "Scripts\python.exe"
                    
                    if ((Test-Path $venvActivate) -or (Test-Path $venvPython)) {
                        $version = "Unknown"
                        
                        if (Test-Path $venvPython) {
                            try {
                                $versionOutput = & $venvPython "-V" 2>&1
                                if ($versionOutput -match "Python (\d+\.\d+\.\d+)") {
                                    $version = $matches[1]
                                }
                            } catch {}
                        }
                        
                        $foundVenvs += @{
                            Path = $_.FullName
                            Version = $version
                            Type = "Standard venv"
                        }
                    }
                }
            }
        }
        
        $pythonData.VirtualEnvironments = $foundVenvs
    } catch {
        $pythonData.VirtualEnvironments = "Unable to collect virtual environments"
    }
    
    return $pythonData
}