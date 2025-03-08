# TaskCollector.ps1
# Collects information about scheduled tasks

function Get-TaskData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting scheduled tasks data..." -ForegroundColor Yellow
    
    $taskData = @()
    
    try {
        # Get scheduled tasks
        $tasks = Get-ScheduledTask -ErrorAction SilentlyContinue
        
        $taskData = @(
            $tasks | ForEach-Object {
                $taskInfo = Get-ScheduledTaskInfo -TaskName $_.TaskName -TaskPath $_.TaskPath -ErrorAction SilentlyContinue
                
                @{
                    TaskName = $_.TaskName
                    TaskPath = $_.TaskPath
                    State = $_.State.ToString()
                    Enabled = $_.Settings.Enabled
                    Author = $_.Principal.UserId
                    LastRunTime = if ($taskInfo.LastRunTime) { $taskInfo.LastRunTime.ToString('yyyy-MM-dd HH:mm:ss') } else { "Never" }
                    LastResult = if ($taskInfo.LastTaskResult -ne $null) { $taskInfo.LastTaskResult } else { "Unknown" }
                    NextRunTime = if ($taskInfo.NextRunTime) { $taskInfo.NextRunTime.ToString('yyyy-MM-dd HH:mm:ss') } else { "Not scheduled" }
                    Triggers = @(
                        $_.Triggers | ForEach-Object {
                            @{
                                Type = $_.GetType().Name
                                Enabled = $_.Enabled
                                StartBoundary = if ($_.StartBoundary) { $_.StartBoundary } else { "Not set" }
                                EndBoundary = if ($_.EndBoundary) { $_.EndBoundary } else { "Not set" }
                            }
                        }
                    )
                }
            }
        )
    } catch {
        $taskData = "Unable to collect scheduled tasks information"
    }
    
    return $taskData
}