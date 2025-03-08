# EnvironmentCollector.ps1
# Collects information about environment variables

function Get-EnvironmentData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting environment variables data..." -ForegroundColor Yellow
    
    $envData = @{
        SystemVariables = @()
        UserVariables = @()
        ProcessVariables = @()
    }
    
    # Get system environment variables
    try {
        $sysEnvVars = [Environment]::GetEnvironmentVariables('Machine')
        
        $envData.SystemVariables = @(
            $sysEnvVars.GetEnumerator() | Sort-Object Name | ForEach-Object {
                @{
                    Name = $_.Name
                    Value = $_.Value
                }
            }
        )
    } catch {
        $envData.SystemVariables = "Unable to collect system environment variables"
    }
    
    # Get user environment variables
    try {
        $userEnvVars = [Environment]::GetEnvironmentVariables('User')
        
        $envData.UserVariables = @(
            $userEnvVars.GetEnumerator() | Sort-Object Name | ForEach-Object {
                @{
                    Name = $_.Name
                    Value = $_.Value
                }
            }
        )
    } catch {
        $envData.UserVariables = "Unable to collect user environment variables"
    }
    
    # Get process environment variables (current session)
    try {
        $processEnvVars = [Environment]::GetEnvironmentVariables('Process')
        
        $envData.ProcessVariables = @(
            $processEnvVars.GetEnumerator() | Sort-Object Name | ForEach-Object {
                @{
                    Name = $_.Name
                    Value = $_.Value
                }
            }
        )
    } catch {
        $envData.ProcessVariables = "Unable to collect process environment variables"
    }
    
    return $envData
}