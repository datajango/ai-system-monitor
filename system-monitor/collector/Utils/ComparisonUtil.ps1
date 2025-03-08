# ComparisonUtil.ps1
# Functions for comparing system state snapshots

function Compare-SystemStates {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true)]
        [string]$BaselinePath,
        
        [Parameter(Mandatory=$true)]
        [string]$CurrentPath,
        
        [Parameter()]
        [string[]]$Sections = @('Path', 'InstalledPrograms', 'RunningServices', 'DiskSpace')
    )
    
    # Determine if we're working with folders or single files
    $baselineIsFolder = (Test-Path $BaselinePath) -and (Get-Item $BaselinePath).PSIsContainer
    $currentIsFolder = (Test-Path $CurrentPath) -and (Get-Item $CurrentPath).PSIsContainer
    
    if (-not (Test-Path $BaselinePath)) {
        Write-Host "Baseline path not found: $BaselinePath" -ForegroundColor Red
        return
    }
    
    if (-not (Test-Path $CurrentPath)) {
        Write-Host "Current path not found: $CurrentPath" -ForegroundColor Red
        return
    }
    
    # Get metadata from files or folders
    if ($baselineIsFolder) {
        $baselineMetadataPath = Join-Path -Path $BaselinePath -ChildPath "metadata.json"
        if (Test-Path $baselineMetadataPath) {
            $baselineMetadata = Get-Content -Path $baselineMetadataPath -Raw | ConvertFrom-Json
            $baselineTime = [DateTime]::Parse($baselineMetadata.Timestamp)
        } else {
            Write-Host "Baseline metadata file not found in: $BaselinePath" -ForegroundColor Yellow
            $baselineTime = (Get-Item $BaselinePath).CreationTime
        }
    } else {
        $baseline = Get-Content -Path $BaselinePath -Raw | ConvertFrom-Json
        $baselineTime = [DateTime]::Parse($baseline.Timestamp)
    }
    
    if ($currentIsFolder) {
        $currentMetadataPath = Join-Path -Path $CurrentPath -ChildPath "metadata.json"
        if (Test-Path $currentMetadataPath) {
            $currentMetadata = Get-Content -Path $currentMetadataPath -Raw | ConvertFrom-Json
            $currentTime = [DateTime]::Parse($currentMetadata.Timestamp)
        } else {
            Write-Host "Current metadata file not found in: $CurrentPath" -ForegroundColor Yellow
            $currentTime = (Get-Item $CurrentPath).CreationTime
        }
    } else {
        $current = Get-Content -Path $CurrentPath -Raw | ConvertFrom-Json
        $currentTime = [DateTime]::Parse($current.Timestamp)
    }
    
    $timeSpan = $currentTime - $baselineTime
    
    Write-Host "`nComparing system states:" -ForegroundColor Cyan
    Write-Host "- Baseline: $($baselineTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
    Write-Host "- Current:  $($currentTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
    Write-Host "- Time difference: $($timeSpan.Days) days, $($timeSpan.Hours) hours, $($timeSpan.Minutes) minutes" -ForegroundColor White
    
    # Function to load section data from either a single file or folder structure
    function Get-SectionData {
        param(
            [string]$Path,
            [bool]$IsFolder,
            [string]$SectionName
        )
        
        if ($IsFolder) {
            $sectionPath = Join-Path -Path $Path -ChildPath "$SectionName.json"
            if (Test-Path $sectionPath) {
                $sectionData = Get-Content -Path $sectionPath -Raw | ConvertFrom-Json
                return $sectionData.Data
            } else {
                Write-Host "  Section file not found: $sectionPath" -ForegroundColor Yellow
                return $null
            }
        } else {
            $allData = Get-Content -Path $Path -Raw | ConvertFrom-Json
            $propInfo = $allData.PSObject.Properties[$SectionName]
            if ($propInfo) {
                return $propInfo.Value
            } else {
                Write-Host "  Section '$SectionName' not found in file: $Path" -ForegroundColor Yellow
                return $null
            }
        }
    }
    
    # Process each requested section
    foreach ($section in $Sections) {
        Write-Host "`n$section Changes:" -ForegroundColor Cyan
        
        $baselineData = Get-SectionData -Path $BaselinePath -IsFolder $baselineIsFolder -SectionName $section
        $currentData = Get-SectionData -Path $CurrentPath -IsFolder $currentIsFolder -SectionName $section
        
        if ($null -eq $baselineData -or $null -eq $currentData) {
            Write-Host "  Unable to compare $section - missing data" -ForegroundColor Yellow
            continue
        }
        
        # Call the appropriate comparison function based on section name
        switch ($section) {
            'Path' { 
                Compare-Paths -Baseline $baselineData -Current $currentData 
            }
            'InstalledPrograms' { 
                Compare-Programs -Baseline $baselineData -Current $currentData 
            }
            'RunningServices' {
                Compare-Services -Baseline $baselineData -Current $currentData
            }
            'DiskSpace' {
                Compare-DiskSpace -Baseline $baselineData -Current $currentData
            }
            'Network' {
                if (Get-Command -Name Compare-NetworkSettings -ErrorAction SilentlyContinue) {
                    Compare-NetworkSettings -Baseline $baselineData -Current $currentData
                } else {
                    Write-Host "  Network comparison function not available" -ForegroundColor Yellow
                }
            }
            'Environment' {
                if (Get-Command -Name Compare-EnvironmentVariables -ErrorAction SilentlyContinue) {
                    Compare-EnvironmentVariables -Baseline $baselineData -Current $currentData
                } else {
                    Write-Host "  Environment comparison function not available" -ForegroundColor Yellow
                }
            }
            default {
                Write-Host "  No specific comparison function for $section section" -ForegroundColor Yellow
            }
        }
    }
}

function Compare-Programs {
    [CmdletBinding()]
    param (
        $Baseline,
        $Current
    )
    
    $baselinePrograms = $Baseline | ForEach-Object { $_.Name }
    $currentPrograms = $Current | ForEach-Object { $_.Name }
    
    $newPrograms = $currentPrograms | Where-Object { $baselinePrograms -notcontains $_ }
    $removedPrograms = $baselinePrograms | Where-Object { $currentPrograms -notcontains $_ }
    
    Write-Host "- New programs ($($newPrograms.Count)):" -ForegroundColor Green
    $newPrograms | ForEach-Object { Write-Host "  * $_" -ForegroundColor Green }
    
    Write-Host "- Removed programs ($($removedPrograms.Count)):" -ForegroundColor Yellow
    $removedPrograms | ForEach-Object { Write-Host "  * $_" -ForegroundColor Yellow }
}

function Compare-Paths {
    [CmdletBinding()]
    param (
        $Baseline,
        $Current
    )
    
    $baselinePaths = $Baseline | ForEach-Object { $_.Path }
    $currentPaths = $Current | ForEach-Object { $_.Path }
    
    $newPaths = $currentPaths | Where-Object { $baselinePaths -notcontains $_ }
    $removedPaths = $baselinePaths | Where-Object { $currentPaths -notcontains $_ }
    
    Write-Host "- New PATH entries ($($newPaths.Count)):" -ForegroundColor Green
    $newPaths | ForEach-Object { Write-Host "  * $_" -ForegroundColor Green }
    
    Write-Host "- Removed PATH entries ($($removedPaths.Count)):" -ForegroundColor Yellow
    $removedPaths | ForEach-Object { Write-Host "  * $_" -ForegroundColor Yellow }
}

function Compare-Services {
    [CmdletBinding()]
    param (
        $Baseline,
        $Current
    )
    
    $baselineServices = $Baseline | ForEach-Object { $_.Name }
    $currentServices = $Current | ForEach-Object { $_.Name }
    
    $newServices = $currentServices | Where-Object { $baselineServices -notcontains $_ }
    $stoppedServices = $baselineServices | Where-Object { $currentServices -notcontains $_ }
    
    Write-Host "- Newly running services ($($newServices.Count)):" -ForegroundColor Green
    $newServices | ForEach-Object { Write-Host "  * $_" -ForegroundColor Green }
    
    Write-Host "- No longer running services ($($stoppedServices.Count)):" -ForegroundColor Yellow
    $stoppedServices | ForEach-Object { Write-Host "  * $_" -ForegroundColor Yellow }
}

function Compare-DiskSpace {
    [CmdletBinding()]
    param (
        $Baseline,
        $Current
    )
    
    foreach ($currentDisk in $Current) {
        $baselineDisk = $Baseline | Where-Object { $_.Name -eq $currentDisk.Name } | Select-Object -First 1
        
        if ($baselineDisk) {
            $freeChange = $currentDisk.FreeGB - $baselineDisk.FreeGB
            $direction = if ($freeChange -ge 0) { "increased" } else { "decreased" }
            $color = if ($freeChange -ge 0) { "Green" } else { "Yellow" }
            
            Write-Host "- Drive $($currentDisk.Name): Free space has $direction by $([Math]::Abs($freeChange).ToString("0.00")) GB" -ForegroundColor $color
        } else {
            Write-Host "- Drive $($currentDisk.Name): New drive not in baseline" -ForegroundColor Cyan
        }
    }
}