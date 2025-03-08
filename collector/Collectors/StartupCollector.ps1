# StartupCollector.ps1
# Collects information about startup programs

function Get-StartupData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting startup programs data..." -ForegroundColor Yellow
    
    $startupPrograms = Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue | 
        Select-Object Name, Command, Location, User
    
    $startupData = @($startupPrograms | ForEach-Object {
        @{
            Name = $_.Name
            Command = $_.Command
            Location = $_.Location
            User = $_.User
        }
    })
    
    return $startupData
}