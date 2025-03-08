# ProgramCollector.ps1
# Collects information about installed programs

function Get-ProgramData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting installed programs data..." -ForegroundColor Yellow
    
    # Get programs from 32-bit registry
    $apps32 = Get-ItemProperty HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
        Where-Object DisplayName -ne $null |
        Select-Object DisplayName, Publisher, DisplayVersion, InstallDate

    # Get programs from 64-bit registry
    $apps64 = Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
        Where-Object DisplayName -ne $null |
        Select-Object DisplayName, Publisher, DisplayVersion, InstallDate

    # Get user-installed programs
    $appsUser = Get-ItemProperty HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
        Where-Object DisplayName -ne $null |
        Select-Object DisplayName, Publisher, DisplayVersion, InstallDate

    # Combine and format the data
    $programData = @($apps32) + @($apps64) + @($appsUser) | 
        Sort-Object DisplayName | 
        ForEach-Object { 
            @{
                Name = $_.DisplayName
                Publisher = $_.Publisher
                Version = $_.DisplayVersion
                InstallDate = $_.InstallDate
            } 
        }
    
    return $programData
}