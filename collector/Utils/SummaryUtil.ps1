# SummaryUtil.ps1
# Functions for generating and displaying system state summaries

function Get-SystemSummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$StateData
    )
    
    $summary = @{
        PathCount = $StateData.Path.Count
        InvalidPathCount = ($StateData.Path | Where-Object { -not $_.Exists }).Count
        ProgramCount = $StateData.InstalledPrograms.Count
        StartupCount = $StateData.StartupPrograms.Count
        ServiceCount = $StateData.RunningServices.Count
        ProcessorUsage = $StateData.PerformanceData.ProcessorUsage
        MemoryUsage = $StateData.PerformanceData.Memory.PercentUsed
        MemoryUsedGB = $StateData.PerformanceData.Memory.UsedGB
        MemoryTotalGB = $StateData.PerformanceData.Memory.TotalGB
    }
    
    return $summary
}

function Show-SystemSummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Summary,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    
    Write-Host "`nSystem state snapshot complete!" -ForegroundColor Green
    Write-Host "Data saved to folder: $OutputPath" -ForegroundColor Green
    
    # Create the summary content for both display and file
    $summaryContent = @"
SYSTEM STATE SNAPSHOT SUMMARY
============================
Date/Time: $(Get-Date)
Computer: $($env:COMPUTERNAME)
User: $($env:USERNAME)

CORE METRICS:
- PATH entries: $($Summary.PathCount) (Invalid: $($Summary.InvalidPathCount))
- Installed programs: $($Summary.ProgramCount)
- Startup programs: $($Summary.StartupCount)
- Running services: $($Summary.ServiceCount)
- Processor usage: $($Summary.ProcessorUsage)%
- Memory usage: $($Summary.MemoryUsage)% ($($Summary.MemoryUsedGB)GB of $($Summary.MemoryTotalGB)GB)

COLLECTED DATA MODULES:
"@
    
    # Get all collected data files
    $dataFiles = Get-ChildItem -Path (Split-Path -Parent $OutputPath) -Filter "*.json" | 
                Where-Object { $_.Name -ne "metadata.json" -and $_.Name -ne "index.json" }
    
    $dataFiles | ForEach-Object {
        $summaryContent += "- $($_.BaseName)`n"
    }
    
    $summaryContent += @"

To compare with other snapshots:
1. First, dot-source the script:
   . .\SystemMonitor.ps1

2. Then run the comparison:
   Compare-SystemStates -BaselinePath "path\to\earlier\snapshot" -CurrentPath "$OutputPath"
"@
    
    # Save summary to file
    $summaryPath = Join-Path -Path (Split-Path -Parent $OutputPath) -ChildPath "summary.txt"
    $summaryContent | Out-File -FilePath $summaryPath -Encoding utf8
    
    # Display summary
    Write-Host "`nSummary:" -ForegroundColor Cyan
    Write-Host "- PATH entries: $($Summary.PathCount) (Invalid: $($Summary.InvalidPathCount))" -ForegroundColor White
    Write-Host "- Installed programs: $($Summary.ProgramCount)" -ForegroundColor White
    Write-Host "- Startup programs: $($Summary.StartupCount)" -ForegroundColor White
    Write-Host "- Running services: $($Summary.ServiceCount)" -ForegroundColor White
    Write-Host "- Processor usage: $($Summary.ProcessorUsage)%" -ForegroundColor White
    Write-Host "- Memory usage: $($Summary.MemoryUsage)% ($($Summary.MemoryUsedGB)GB of $($Summary.MemoryTotalGB)GB)" -ForegroundColor White
    
    Write-Host "`nSummary file saved to: $summaryPath" -ForegroundColor Green
}