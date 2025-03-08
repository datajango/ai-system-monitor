# PathCollector.ps1
# Collects information about the PATH environment variable

function Get-PathData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting PATH data..." -ForegroundColor Yellow
    
    $pathEntries = $env:PATH -split ";" | Where-Object { $_ -ne "" }
    
    $pathData = @($pathEntries | ForEach-Object {
        @{
            Path = $_
            Exists = (Test-Path -Path $_ -ErrorAction SilentlyContinue)
        }
    })
    
    return $pathData
}