# FeaturesCollector.ps1
# Collects information about installed Windows features

function Get-FeaturesData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting Windows features data..." -ForegroundColor Yellow
    
    $featuresData = @()
    
    try {
        # Try using DISM module (works on Windows 10/11)
        $features = Get-WindowsOptionalFeature -Online -ErrorAction SilentlyContinue
        
        if ($features) {
            $featuresData = @(
                $features | ForEach-Object {
                    @{
                        FeatureName = $_.FeatureName
                        State = $_.State.ToString()
                        Description = if ($_.Description) { $_.Description } else { "No description available" }
                    }
                }
            )
        } else {
            # Alternative method using Windows PowerShell
            $features = Get-WindowsFeature -ErrorAction SilentlyContinue
            
            if ($features) {
                $featuresData = @(
                    $features | ForEach-Object {
                        @{
                            FeatureName = $_.Name
                            DisplayName = $_.DisplayName
                            State = if ($_.Installed) { "Enabled" } else { "Disabled" }
                            Description = if ($_.Description) { $_.Description } else { "No description available" }
                        }
                    }
                )
            } else {
                # Fallback to third method using WMI
                $features = Get-WmiObject -Class Win32_OptionalFeature -ErrorAction SilentlyContinue
                
                if ($features) {
                    $featuresData = @(
                        $features | ForEach-Object {
                            @{
                                FeatureName = $_.Name
                                State = if ($_.InstallState -eq 1) { "Enabled" } else { "Disabled" }
                                Caption = $_.Caption
                            }
                        }
                    )
                }
            }
        }
    } catch {
        $featuresData = "Unable to collect Windows features information"
    }
    
    if ($featuresData -eq @()) {
        $featuresData = "No Windows features information available"
    }
    
    return $featuresData
}