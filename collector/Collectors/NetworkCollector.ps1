# NetworkCollector.ps1
# Collects information about network adapters, configurations, and connections

function Get-NetworkData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting network configuration data..." -ForegroundColor Yellow
    
    $networkData = @{
        Adapters = @()
        IPConfiguration = @()
        ActiveConnections = @()
        DNSSettings = @()
    }
    
    # Get network adapters
    try {
        $adapters = Get-NetAdapter -ErrorAction SilentlyContinue | 
            Select-Object Name, InterfaceDescription, Status, MacAddress, LinkSpeed, MediaType
        
        $networkData.Adapters = @($adapters | ForEach-Object {
            @{
                Name = $_.Name
                Description = $_.InterfaceDescription
                Status = $_.Status.ToString()
                MacAddress = $_.MacAddress
                LinkSpeed = $_.LinkSpeed
                MediaType = $_.MediaType
            }
        })
    } catch {
        $networkData.Adapters = "Unable to collect adapter information"
    }
    
    # Get IP configuration
    try {
        $ipConfig = Get-NetIPConfiguration -ErrorAction SilentlyContinue | 
            Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway, DNSServer
        
        $networkData.IPConfiguration = @($ipConfig | ForEach-Object {
            @{
                InterfaceAlias = $_.InterfaceAlias
                IPv4Address = if ($_.IPv4Address) { $_.IPv4Address.IPAddress } else { "Not configured" }
                IPv4Gateway = if ($_.IPv4DefaultGateway) { $_.IPv4DefaultGateway.NextHop } else { "Not configured" }
                DNSServers = if ($_.DNSServer) { 
                    @($_.DNSServer.ServerAddresses) 
                } else { 
                    @("Not configured") 
                }
            }
        })
    } catch {
        $networkData.IPConfiguration = "Unable to collect IP configuration"
    }
    
    # Get active connections
    try {
        $activeConns = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | 
            Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess
        
        $networkData.ActiveConnections = @($activeConns | ForEach-Object {
            $processName = "Unknown"
            try {
                $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    $processName = $process.Name
                }
            } catch {
                $processName = "Unknown"
            }
            
            @{
                LocalAddress = "$($_.LocalAddress):$($_.LocalPort)"
                RemoteAddress = "$($_.RemoteAddress):$($_.RemotePort)"
                State = $_.State.ToString()
                Process = $processName
                PID = $_.OwningProcess
            }
        })
    } catch {
        $networkData.ActiveConnections = "Unable to collect active connections"
    }
    
    # Get DNS client settings
    try {
        $dnsSettings = Get-DnsClientServerAddress -ErrorAction SilentlyContinue | 
            Where-Object { $_.ServerAddresses -ne $null -and $_.ServerAddresses.Count -gt 0 } |
            Select-Object InterfaceAlias, InterfaceIndex, ServerAddresses
        
        $networkData.DNSSettings = @($dnsSettings | ForEach-Object {
            @{
                InterfaceAlias = $_.InterfaceAlias
                InterfaceIndex = $_.InterfaceIndex
                ServerAddresses = @($_.ServerAddresses)
            }
        })
    } catch {
        $networkData.DNSSettings = "Unable to collect DNS settings"
    }
    
    return $networkData
}