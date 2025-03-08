# PerformanceCollector.ps1
# Collects information about system performance (CPU, memory)

function Get-PerformanceData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting performance data..." -ForegroundColor Yellow
    
    $performanceData = @{}
    
    # Collect processor usage
    try {
        $processorTime = Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue
        $performanceData.ProcessorUsage = [math]::Round($processorTime.CounterSamples.CookedValue, 2)
    } catch {
        $performanceData.ProcessorUsage = "Unable to collect"
    }
    
    # Collect memory usage
    try {
        $computerSystem = Get-CimInstance CIM_ComputerSystem
        $operatingSystem = Get-CimInstance CIM_OperatingSystem
        
        $totalMemoryGB = [math]::Round($computerSystem.TotalPhysicalMemory / 1GB, 2)
        $freeMemoryGB = [math]::Round($operatingSystem.FreePhysicalMemory / 1MB, 2)
        $usedMemoryGB = [math]::Round($totalMemoryGB - $freeMemoryGB, 2)
        $percentUsed = [math]::Round(($usedMemoryGB / $totalMemoryGB) * 100, 2)
        
        $performanceData.Memory = @{
            TotalGB = $totalMemoryGB
            FreeGB = $freeMemoryGB
            UsedGB = $usedMemoryGB
            PercentUsed = $percentUsed
        }
    } catch {
        $performanceData.Memory = "Unable to collect"
    }
    
    return $performanceData
}