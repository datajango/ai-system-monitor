# Collector.ps1
# Main script for collecting and comparing system state information


param(
    [Parameter(Position=0)]
    [string]$OutputPath = $PSScriptRoot,
    
    [Parameter(Position=1)]
    [switch]$CompareWithLatest,
    
    [Parameter(HelpMessage="Help text explaining the parameter")]
    [string]$Description = "System state snapshot"
)

# Helper function to write JSON without BOM
function Write-JsonWithoutBOM {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Path,
        
        [Parameter(Mandatory=$true)]
        [string]$JsonContent
    )
    
    $Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $JsonContent, $Utf8NoBomEncoding)
}


# Ensure all paths are absolute
$ScriptRoot = $PSScriptRoot
if ([string]::IsNullOrEmpty($ScriptRoot)) {
    $ScriptRoot = (Get-Location).Path
}

$OutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) { 
    $OutputPath 
} else { 
    Join-Path -Path (Get-Location).Path -ChildPath $OutputPath 
}

# Load all collector modules
Write-Host "Loading modules..." -ForegroundColor Cyan
Get-ChildItem -Path "$ScriptRoot\Collectors" -Filter "*.ps1" | ForEach-Object {
    Write-Host "  Loading $($_.Name)" -ForegroundColor DarkGray
    . $_.FullName
}

# Load utility functions
Get-ChildItem -Path "$ScriptRoot\Utils" -Filter "*.ps1" | ForEach-Object {
    Write-Host "  Loading $($_.Name)" -ForegroundColor DarkGray
    . $_.FullName
}

# Initialize the data structure
$systemState = @{
    Timestamp = (Get-Date).ToString('o')  # ISO 8601 format
    ComputerName = $env:COMPUTERNAME
    UserName = $env:USERNAME
    OSVersion = [System.Environment]::OSVersion.VersionString
}

# Collect data using the loaded collector modules
Write-Host "`nCollecting system data..." -ForegroundColor Yellow

# Call each collection function
$systemState.Path = Get-PathData
$systemState.InstalledPrograms = Get-ProgramData
$systemState.StartupPrograms = Get-StartupData
$systemState.RunningServices = Get-ServiceData
$systemState.DiskSpace = Get-DiskData
$systemState.PerformanceData = Get-PerformanceData

# Additional collectors (if available)
if (Get-Command -Name Get-NetworkData -ErrorAction SilentlyContinue) {
    $systemState.Network = Get-NetworkData
}

if (Get-Command -Name Get-FontData -ErrorAction SilentlyContinue) {
    $systemState.Fonts = Get-FontData
}

if (Get-Command -Name Get-EnvironmentData -ErrorAction SilentlyContinue) {
    $systemState.Environment = Get-EnvironmentData
}

if (Get-Command -Name Get-TaskData -ErrorAction SilentlyContinue) {
    $systemState.ScheduledTasks = Get-TaskData
}

if (Get-Command -Name Get-FeaturesData -ErrorAction SilentlyContinue) {
    $systemState.WindowsFeatures = Get-FeaturesData
}

if (Get-Command -Name Get-RegistryData -ErrorAction SilentlyContinue) {
    $systemState.RegistrySettings = Get-RegistryData
}

if (Get-Command -Name Get-UpdatesData -ErrorAction SilentlyContinue) {
    $systemState.WindowsUpdates = Get-UpdatesData
}

if (Get-Command -Name Get-DriversData -ErrorAction SilentlyContinue) {
    $systemState.Drivers = Get-DriversData
}

if (Get-Command -Name Get-PythonData -ErrorAction SilentlyContinue) {
    $systemState.PythonInstallations = Get-PythonData
}

if (Get-Command -Name Get-BrowserData -ErrorAction SilentlyContinue) {
    $systemState.Browsers = Get-BrowserData
}

# Create a timestamped folder for this snapshot
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$snapshotFolder = Join-Path -Path $OutputPath -ChildPath "SystemState_$timestamp"

if (-not (Test-Path -Path $snapshotFolder)) {
    New-Item -ItemType Directory -Path $snapshotFolder -Force | Out-Null
    Write-Host "Created snapshot directory: $snapshotFolder" -ForegroundColor Green
}

# Save metadata file
$metadataPath = Join-Path -Path $snapshotFolder -ChildPath "metadata.json"
$metadata = @{
    Timestamp = $systemState.Timestamp
    ComputerName = $systemState.ComputerName
    UserName = $systemState.UserName
    OSVersion = $systemState.OSVersion
    SnapshotDate = $timestamp
}
$jsonContent = $metadata | ConvertTo-Json
Write-JsonWithoutBOM -Path $metadataPath -JsonContent $jsonContent

# Save each collector's data to a separate JSON file
Write-Host "Saving data to separate files in: $snapshotFolder" -ForegroundColor Yellow

# Create index of available reports
$reportIndex = @{}

# Helper function to save a section to its own file
function Save-SectionToFile {
    param (
        [string]$SectionName,
        $SectionData,
        [string]$FolderPath
    )
    
    if ($null -ne $SectionData -and $SectionData -ne '') {
        $sectionPath = Join-Path -Path $FolderPath -ChildPath "$SectionName.json"
        $sectionObject = @{
            Timestamp = $systemState.Timestamp
            ComputerName = $systemState.ComputerName
            Data = $SectionData
        }
        $jsonContent = $sectionObject | ConvertTo-Json -Depth 10
        Write-JsonWithoutBOM -Path $sectionPath -JsonContent $jsonContent
        return $true
    }
    return $false
}

# Save each section
$systemState.Keys | Where-Object { $_ -notin @('Timestamp', 'ComputerName', 'UserName', 'OSVersion') } | ForEach-Object {
    $sectionName = $_
    $saved = Save-SectionToFile -SectionName $sectionName -SectionData $systemState[$sectionName] -FolderPath $snapshotFolder
    if ($saved) {
        $reportIndex[$sectionName] = "$sectionName.json"
    }
}

# Save the report index
$indexPath = Join-Path -Path $snapshotFolder -ChildPath "index.json"
$jsonContent = $reportIndex | ConvertTo-Json
Write-JsonWithoutBOM -Path $indexPath -JsonContent $jsonContent

# Create a summary file path for easier reference
$summaryPath = Join-Path -Path $snapshotFolder -ChildPath "summary.txt"

# Generate summary
$summary = Get-SystemSummary -StateData $systemState
Show-SystemSummary -Summary $summary -OutputPath $summaryPath

# Check if we should compare with the latest previous snapshot
if ($CompareWithLatest) {
    $previousSnapshots = Get-ChildItem -Path $OutputPath -Filter "SystemState_*" | 
                        Where-Object { $_.PSIsContainer -and $_.Name -ne "SystemState_$timestamp" } |
                        Sort-Object LastWriteTime -Descending
    
    if ($previousSnapshots.Count -gt 0) {
        $latestSnapshot = $previousSnapshots[0].FullName
        Write-Host "`nComparing with latest snapshot: $($previousSnapshots[0].Name)" -ForegroundColor Magenta
        
        # Get available sections from both snapshots for comparison
        $currentSections = (Get-ChildItem -Path $snapshotFolder -Filter "*.json" | 
                          Where-Object { $_.Name -ne "metadata.json" -and $_.Name -ne "index.json" }).BaseName
        
        $baselineSections = (Get-ChildItem -Path $latestSnapshot -Filter "*.json" | 
                           Where-Object { $_.Name -ne "metadata.json" -and $_.Name -ne "index.json" }).BaseName
        
        # Find sections that exist in both snapshots
        $commonSections = $currentSections | Where-Object { $baselineSections -contains $_ }
        
        Compare-SystemStates -BaselinePath $latestSnapshot -CurrentPath $snapshotFolder -Sections $commonSections
    } else {
        Write-Host "`nNo previous snapshots found to compare with." -ForegroundColor Yellow
    }
}

Write-Host "`nTo compare snapshots later, dot-source this script and use:" -ForegroundColor Magenta
Write-Host ". .\Collector.ps1" -ForegroundColor DarkGray
Write-Host "Compare-SystemStates -BaselinePath 'SystemState_[earlier-date]' -CurrentPath 'SystemState_[later-date]'" -ForegroundColor DarkGray
Write-Host "Compare-SystemStates -BaselinePath 'SystemState_[earlier-date]' -CurrentPath 'SystemState_[later-date]' -Sections 'Path','InstalledPrograms','Network'" -ForegroundColor DarkGray