# ServiceCollector.ps1
# Collects information about running services

function Get-ServiceData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting running services data..." -ForegroundColor Yellow
    
    $runningServices = Get-Service | 
        Where-Object {$_.Status -eq "Running"} | 
        Sort-Object DisplayName | 
        Select-Object DisplayName, Name, StartType
    
    $serviceData = @($runningServices | ForEach-Object {
        @{
            DisplayName = $_.DisplayName
            Name = $_.Name
            StartType = $_.StartType.ToString()
        }
    })
    
    return $serviceData
}