# UpdatesCollector.ps1
# Collects information about installed Windows updates

function Get-UpdatesData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting Windows updates data..." -ForegroundColor Yellow
    
    $updatesData = @{
        InstalledUpdates = @()
        UpdateSettings = @{}
    }
    
    # Get installed updates
    try {
        $session = New-Object -ComObject Microsoft.Update.Session
        $searcher = $session.CreateUpdateSearcher()
        $historyCount = $searcher.GetTotalHistoryCount()
        
        # Limit to the last 100 updates to avoid performance issues
        $limit = [Math]::Min(100, $historyCount)
        $updates = $searcher.QueryHistory(0, $limit)
        
        $updatesData.InstalledUpdates = @(
            $updates | ForEach-Object {
                @{
                    Title = $_.Title
                    Description = $_.Description
                    Date = $_.Date.ToString('yyyy-MM-dd HH:mm:ss')
                    Operation = switch ($_.Operation) {
                        1 { "Installation" }
                        2 { "Uninstallation" }
                        3 { "Other" }
                        default { "Unknown" }
                    }
                    Status = switch ($_.ResultCode) {
                        0 { "Not Started" }
                        1 { "In Progress" }
                        2 { "Succeeded" }
                        3 { "Succeeded With Errors" }
                        4 { "Failed" }
                        5 { "Aborted" }
                        default { "Unknown" }
                    }
                    KB = if ($_.Title -match 'KB\d+') { $matches[0] } else { "N/A" }
                }
            }
        )
    } catch {
        $updatesData.InstalledUpdates = "Unable to collect Windows update history"
    }
    
    # Get Windows Update settings
    try {
        $AUSettings = (New-Object -ComObject Microsoft.Update.AutoUpdate).Settings
        
        $updatesData.UpdateSettings = @{
            NotificationLevel = switch ($AUSettings.NotificationLevel) {
                0 { "Not configured" }
                1 { "Disabled" }
                2 { "Notify before download" }
                3 { "Notify before installation" }
                4 { "Scheduled installation" }
                default { "Unknown" }
            }
            IncludeRecommendedUpdates = $AUSettings.IncludeRecommendedUpdates
            UseWUServer = $null
        }
        
        # Get registry setting for WSUS
        $wuServer = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "UseWUServer" -ErrorAction SilentlyContinue).UseWUServer
        $updatesData.UpdateSettings.UseWUServer = $wuServer -eq 1
        
    } catch {
        $updatesData.UpdateSettings = "Unable to collect Windows Update settings"
    }
    
    return $updatesData
}