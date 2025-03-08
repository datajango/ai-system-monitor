# ExtendedComparisonUtil.ps1
# Additional comparison functions for the new collectors

function Compare-NetworkSettings {
    [CmdletBinding()]
    param (
        $Baseline,
        $Current
    )
    
    if (-not $Baseline -or -not $Current) {
        Write-Host "  Network data not available in one or both snapshots" -ForegroundColor Yellow
        return
    }
    
    # Compare network adapters
    Write-Host "- Network adapters changes:" -ForegroundColor Cyan
    
    $baselineAdapters = @{}
    foreach ($adapter in $Baseline.Adapters) {
        $baselineAdapters[$adapter.Name] = $adapter
    }
    
    $currentAdapters = @{}
    foreach ($adapter in $Current.Adapters) {
        $currentAdapters[$adapter.Name] = $adapter
    }
    
    $newAdapters = $currentAdapters.Keys | Where-Object { $baselineAdapters.Keys -notcontains $_ }
    $removedAdapters = $baselineAdapters.Keys | Where-Object { $currentAdapters.Keys -notcontains $_ }
    $changedAdapters = $currentAdapters.Keys | Where-Object { 
        $baselineAdapters.Keys -contains $_ -and 
        ($currentAdapters[$_].Status -ne $baselineAdapters[$_].Status -or
         $currentAdapters[$_].LinkSpeed -ne $baselineAdapters[$_].LinkSpeed)
    }
    
    Write-Host "  New adapters ($($newAdapters.Count)):" -ForegroundColor Green
    $newAdapters | ForEach-Object { Write-Host "    * $($_)" -ForegroundColor Green }
    
    Write-Host "  Removed adapters ($($removedAdapters.Count)):" -ForegroundColor Yellow
    $removedAdapters | ForEach-Object { Write-Host "    * $($_)" -ForegroundColor Yellow }
    
    Write-Host "  Changed adapters ($($changedAdapters.Count)):" -ForegroundColor Cyan
    foreach ($adapter in $changedAdapters) {
        $baselineAdapter = $baselineAdapters[$adapter]
        $currentAdapter = $currentAdapters[$adapter]
        
        Write-Host "    * $adapter:" -ForegroundColor Cyan
        
        if ($baselineAdapter.Status -ne $currentAdapter.Status) {
            Write-Host "      Status changed: $($baselineAdapter.Status) -> $($currentAdapter.Status)" -ForegroundColor Cyan
        }
        
        if ($baselineAdapter.LinkSpeed -ne $currentAdapter.LinkSpeed) {
            Write-Host "      Link speed changed: $($baselineAdapter.LinkSpeed) -> $($currentAdapter.LinkSpeed)" -ForegroundColor Cyan
        }
    }
    
    # Compare IP configuration
    Write-Host "- IP configuration changes:" -ForegroundColor Cyan
    
    $baselineIPs = @{}
    foreach ($ip in $Baseline.IPConfiguration) {
        $baselineIPs[$ip.InterfaceAlias] = $ip
    }
    
    $currentIPs = @{}
    foreach ($ip in $Current.IPConfiguration) {
        $currentIPs[$ip.InterfaceAlias] = $ip
    }
    
    $changedIPs = $currentIPs.Keys | Where-Object { 
        $baselineIPs.Keys -contains $_ -and 
        ($currentIPs[$_].IPv4Address -ne $baselineIPs[$_].IPv4Address -or
         $currentIPs[$_].IPv4Gateway -ne $baselineIPs[$_].IPv4Gateway)
    }
    
    Write-Host "  Changed IP configurations ($($changedIPs.Count)):" -ForegroundColor Cyan
    foreach ($interface in $changedIPs) {
        $baselineIP = $baselineIPs[$interface]
        $currentIP = $currentIPs[$interface]
        
        Write-Host "    * $interface:" -ForegroundColor Cyan
        
        if ($baselineIP.IPv4Address -ne $currentIP.IPv4Address) {
            Write-Host "      IP address changed: $($baselineIP.IPv4Address) -> $($currentIP.IPv4Address)" -ForegroundColor Cyan
        }
        
        if ($baselineIP.IPv4Gateway -ne $currentIP.IPv4Gateway) {
            Write-Host "      Gateway changed: $($baselineIP.IPv4Gateway) -> $($currentIP.IPv4Gateway)" -ForegroundColor Cyan
        }
    }
}

function Compare-EnvironmentVariables {
    [CmdletBinding()]
    param (
        $Baseline,
        $Current
    )
    
    if (-not $Baseline -or -not $Current) {
        Write-Host "  Environment variables data not available in one or both snapshots" -ForegroundColor Yellow
        return
    }
    
    # Compare system variables
    Write-Host "- System environment variables changes:" -ForegroundColor Cyan
    
    $baselineSystemVars = @{}
    foreach ($var in $Baseline.SystemVariables) {
        $baselineSystemVars[$var.Name] = $var.Value
    }
    
    $currentSystemVars = @{}
    foreach ($var in $Current.SystemVariables) {
        $currentSystemVars[$var.Name] = $var.Value
    }
    
    $newSystemVars = $currentSystemVars.Keys | Where-Object { $baselineSystemVars.Keys -notcontains $_ }
    $removedSystemVars = $baselineSystemVars.Keys | Where-Object { $currentSystemVars.Keys -notcontains $_ }
    $changedSystemVars = $currentSystemVars.Keys | Where-Object { 
        $baselineSystemVars.Keys -contains $_ -and 
        $currentSystemVars[$_] -ne $baselineSystemVars[$_]
    }
    
    Write-Host "  New system variables ($($newSystemVars.Count)):" -ForegroundColor Green
    $newSystemVars | ForEach-Object { 
        $shortValue = if ($currentSystemVars[$_].Length -gt 50) { $currentSystemVars[$_].Substring(0, 47) + "..." } else { $currentSystemVars[$_] }
        Write-Host "    * $($_) = $shortValue" -ForegroundColor Green 
    }
    
    Write-Host "  Removed system variables ($($removedSystemVars.Count)):" -ForegroundColor Yellow
    $removedSystemVars | ForEach-Object { Write-Host "    * $($_)" -ForegroundColor Yellow }
    
    Write-Host "  Changed system variables ($($changedSystemVars.Count)):" -ForegroundColor Cyan
    foreach ($var in $changedSystemVars) {
        $baselineValue = $baselineSystemVars[$var]
        $currentValue = $currentSystemVars[$var]
        
        $baselineShort = if ($baselineValue.Length -gt 50) { $baselineValue.Substring(0, 47) + "..." } else { $baselineValue }
        $currentShort = if ($currentValue.Length -gt 50) { $currentValue.Substring(0, 47) + "..." } else { $currentValue }
        
        Write-Host "    * $var:" -ForegroundColor Cyan
        Write-Host "      From: $baselineShort" -ForegroundColor DarkGray
        Write-Host "      To:   $currentShort" -ForegroundColor Cyan
    }
    
    # Compare user variables (similar approach)
    Write-Host "- User environment variables changes:" -ForegroundColor Cyan
    
    $baselineUserVars = @{}
    foreach ($var in $Baseline.UserVariables) {
        $baselineUserVars[$var.Name] = $var.Value