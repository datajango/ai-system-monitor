# FontCollector.ps1
# Collects information about installed fonts

function Get-FontData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting installed fonts data..." -ForegroundColor Yellow
    
    $fontData = @()
    
    try {
        # PowerShell way of accessing the fonts
        $shellApp = New-Object -ComObject Shell.Application
        $fontFolder = $shellApp.Namespace(0x14) # 0x14 is the fonts folder
        
        $fonts = $fontFolder.Items()
        
        $fontData = @(
            foreach ($font in $fonts) {
                $fontType = "Unknown"
                if ($font.Name -match '\.ttf$') { $fontType = "TrueType" }
                elseif ($font.Name -match '\.otf$') { $fontType = "OpenType" }
                elseif ($font.Name -match '\.fon$') { $fontType = "Raster" }
                
                @{
                    Name = $font.Name
                    Path = $fontFolder.GetDetailsOf($font, 0)
                    Type = $fontType
                    DateModified = $fontFolder.GetDetailsOf($font, 3)
                }
            }
        )
    } catch {
        # Alternative method using the registry
        try {
            $fontRegistry = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" -ErrorAction SilentlyContinue
            
            if ($fontRegistry) {
                $fontData = @(
                    $fontRegistry.PSObject.Properties | 
                    Where-Object { $_.Name -notmatch '^\(default\)$' -and $_.Name -ne 'PSPath' -and $_.Name -ne 'PSParentPath' -and $_.Name -ne 'PSChildName' -and $_.Name -ne 'PSDrive' -and $_.Name -ne 'PSProvider' } |
                    ForEach-Object {
                        $fontType = "Unknown"
                        $fontValue = $_.Value
                        
                        if ($fontValue -match '\.ttf$') { $fontType = "TrueType" }
                        elseif ($fontValue -match '\.otf$') { $fontType = "OpenType" }
                        elseif ($fontValue -match '\.fon$') { $fontType = "Raster" }
                        
                        @{
                            Name = $_.Name
                            Path = $_.Value
                            Type = $fontType
                        }
                    }
                )
            }
        } catch {
            $fontData = "Unable to collect font information"
        }
    }
    
    return $fontData
}