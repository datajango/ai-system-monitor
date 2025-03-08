# RegistryCollector.ps1
# Collects important registry settings that affect system behavior

function Get-RegistryData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting important registry settings..." -ForegroundColor Yellow
    
    $registryData = @{
        WindowsSettings = @()
        SecuritySettings = @()
        StartupPrograms = @()
        FileAssociations = @()
    }
    
    # Key Windows settings
    try {
        $windowsSettings = @(
            # Explorer settings
            @{
                Name = "Show file extensions"
                Path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
                Value = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "HideFileExt" -ErrorAction SilentlyContinue).HideFileExt
                Enabled = ((Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "HideFileExt" -ErrorAction SilentlyContinue).HideFileExt -eq 0)
            },
            # UAC settings
            @{
                Name = "User Account Control (UAC) Level"
                Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
                Value = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -ErrorAction SilentlyContinue).EnableLUA
                Enabled = ((Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -ErrorAction SilentlyContinue).EnableLUA -eq 1)
            },
            # Remote Desktop
            @{
                Name = "Remote Desktop"
                Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server"
                Value = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -ErrorAction SilentlyContinue).fDenyTSConnections
                Enabled = ((Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -ErrorAction SilentlyContinue).fDenyTSConnections -eq 0)
            },
            # Power settings
            @{
                Name = "Hibernation"
                Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
                Value = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -ErrorAction SilentlyContinue).HibernateEnabled
                Enabled = ((Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -ErrorAction SilentlyContinue).HibernateEnabled -eq 1)
            }
        )
        
        $registryData.WindowsSettings = $windowsSettings
    } catch {
        $registryData.WindowsSettings = "Unable to collect Windows settings from registry"
    }
    
    # Security settings
    try {
        $securitySettings = @(
            # Windows Firewall
            @{
                Name = "Windows Firewall (Domain Profile)"
                Path = "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile"
                Value = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile" -Name "EnableFirewall" -ErrorAction SilentlyContinue).EnableFirewall
                Enabled = ((Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile" -Name "EnableFirewall" -ErrorAction SilentlyContinue).EnableFirewall -eq 1)
            },
            @{
                Name = "Windows Firewall (Private Profile)"
                Path = "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PrivateProfile"
                Value = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PrivateProfile" -Name "EnableFirewall" -ErrorAction SilentlyContinue).EnableFirewall
                Enabled = ((Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PrivateProfile" -Name "EnableFirewall" -ErrorAction SilentlyContinue).EnableFirewall -eq 1)
            },
            @{
                Name = "Windows Firewall (Public Profile)"
                Path = "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile"
                Value = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile" -Name "EnableFirewall" -ErrorAction SilentlyContinue).EnableFirewall
                Enabled = ((Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile" -Name "EnableFirewall" -ErrorAction SilentlyContinue).EnableFirewall -eq 1)
            },
            # Windows Defender
            @{
                Name = "Windows Defender Real-time Protection"
                Path = "HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection"
                Value = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection" -Name "DisableRealtimeMonitoring" -ErrorAction SilentlyContinue).DisableRealtimeMonitoring
                Enabled = ((Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows Defender\Real-Time Protection" -Name "DisableRealtimeMonitoring" -ErrorAction SilentlyContinue).DisableRealtimeMonitoring -eq 0)
            }
        )
        
        $registryData.SecuritySettings = $securitySettings
    } catch {
        $registryData.SecuritySettings = "Unable to collect security settings from registry"
    }
    
    # Registry run keys (additional startup items)
    try {
        $startupKeys = @(
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
            "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
            "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
        )
        
        $startupPrograms = @()
        
        foreach ($key in $startupKeys) {
            if (Test-Path $key) {
                $keyProps = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
                
                $keyProps.PSObject.Properties | Where-Object { 
                    $_.Name -notmatch '^PS.*' 
                } | ForEach-Object {
                    $startupPrograms += @{
                        Name = $_.Name
                        Command = $_.Value
                        Location = $key
                    }
                }
            }
        }
        
        $registryData.StartupPrograms = $startupPrograms
    } catch {
        $registryData.StartupPrograms = "Unable to collect registry startup programs"
    }
    
    # File associations (sample of common ones)
    try {
        $fileExtensions = @(".txt", ".pdf", ".html", ".docx", ".xlsx", ".png", ".jpg", ".mp3", ".mp4", ".zip")
        $fileAssociations = @()
        
        foreach ($ext in $fileExtensions) {
            $fileType = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\$ext\UserChoice" -Name "ProgId" -ErrorAction SilentlyContinue).ProgId
            
            if ($fileType) {
                $fileAssociations += @{
                    Extension = $ext
                    AssociatedProgram = $fileType
                }
            }
        }
        
        $registryData.FileAssociations = $fileAssociations
    } catch {
        $registryData.FileAssociations = "Unable to collect file associations from registry"
    }
    
    return $registryData
}