# DiskCollector.ps1
# Collects information about disk space

function Get-DiskData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting disk space data..." -ForegroundColor Yellow
    
    $disks = Get-PSDrive -PSProvider FileSystem
    
    $diskData = @($disks | ForEach-Object {
        $used = $_.Used
        $free = $_.Free
        $total = $used + $free
        $percentFree = if ($total -gt 0) { [math]::Round(($free/$total) * 100, 2) } else { 0 }
        
        @{
            Name = $_.Name
            Root = $_.Root
            UsedGB = if ($used) { [math]::Round($used/1GB, 2) } else { 0 }
            FreeGB = if ($free) { [math]::Round($free/1GB, 2) } else { 0 }
            TotalGB = if ($total -gt 0) { [math]::Round($total/1GB, 2) } else { 0 }
            PercentFree = $percentFree
        }
    })
    
    return $diskData
}