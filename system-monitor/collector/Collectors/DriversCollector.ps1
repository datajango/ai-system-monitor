# DriversCollector.ps1
# Collects information about installed device drivers

function Get-DriversData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting device drivers data..." -ForegroundColor Yellow
    
    $driversData = @()
    
    try {
        # Get device drivers, limiting to most important ones with versions
        $drivers = Get-WmiObject Win32_PnPSignedDriver | 
            Where-Object { $_.DeviceName -ne $null -and $_.DriverVersion -ne $null } |
            Sort-Object DeviceName
        
        $driversData = @(
            $drivers | ForEach-Object {
                @{
                    DeviceName = $_.DeviceName
                    DeviceClass = $_.DeviceClass
                    Manufacturer = $_.Manufacturer
                    DriverVersion = $_.DriverVersion
                    DriverDate = if ($_.DriverDate) { 
                        [Management.ManagementDateTimeConverter]::ToDateTime($_.DriverDate).ToString('yyyy-MM-dd')
                    } else {
                        "Unknown"
                    }
                    DriverProviderName = $_.DriverProviderName
                    IsSigned = $_.IsSigned
                    Location = $_.Location
                }
            }
        )
    } catch {
        # Alternative method if WMI fails
        try {
            $drivers = Get-CimInstance -ClassName Win32_PnPSignedDriver -ErrorAction SilentlyContinue | 
                Where-Object { $_.DeviceName -ne $null -and $_.DriverVersion -ne $null } |
                Sort-Object DeviceName
            
            $driversData = @(
                $drivers | ForEach-Object {
                    @{
                        DeviceName = $_.DeviceName
                        DeviceClass = $_.DeviceClass
                        Manufacturer = $_.Manufacturer
                        DriverVersion = $_.DriverVersion
                        DriverDate = if ($_.DriverDate) {
                            [DateTime]$_.DriverDate.ToString('yyyy-MM-dd')
                        } else {
                            "Unknown"
                        }
                        DriverProviderName = $_.DriverProviderName
                        IsSigned = $_.IsSigned
                        Location = $_.Location
                    }
                }
            )
        } catch {
            $driversData = "Unable to collect device drivers information"
        }
    }
    
    return $driversData
}