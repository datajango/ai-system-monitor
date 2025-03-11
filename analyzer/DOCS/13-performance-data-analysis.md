# Performance Data Analyzer Component

## Overview

The Performance Data Analyzer is a specialized component of the System State Analyzer that examines system resource utilization, focusing primarily on processor and memory usage. This component analyzes data collected from the `PerformanceData.json` file produced by the System State Collector, providing insights into system performance, resource bottlenecks, and potential optimization opportunities.

## Input Data Source

**Filename**: `PerformanceData.json`

According to the documentation in `13-performance-data.md`, the Performance Data collector gathers point-in-time metrics about:
- Current CPU usage across all cores
- Memory utilization and availability
- Memory configuration and allocation
- System resource pressure indicators

The collection is performed by the `PerformanceCollector.ps1` script, which uses Windows performance counters and WMI/CIM queries to gather real-time usage statistics.

## Analyzer Implementation

The source code shows a dedicated `PerformanceDataAnalyzer` class registered with the analyzer registry:

```python
@SectionAnalyzerRegistry.register
class PerformanceDataAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for system performance data.
    """
    
    # Thresholds for CPU usage
    CPU_IDLE = 15         # Below this is considered idle
    CPU_NORMAL = 50       # Below this is considered normal load
    CPU_HIGH = 80         # Below this is considered high but acceptable
    CPU_CRITICAL = 90     # Above this is considered critically high
    
    # Thresholds for memory usage (percentage)
    MEMORY_LOW = 50       # Below this is considered low utilization
    MEMORY_NORMAL = 70    # Below this is considered normal utilization
    MEMORY_HIGH = 85      # Below this is considered high but acceptable
    MEMORY_CRITICAL = 95  # Above this is considered critically high
    
    # Thresholds for memory (absolute values in GB)
    MIN_FREE_MEMORY = 2   # Systems should have at least this much free memory
```

This class extends the `BaseSectionAnalyzer` class and defines several threshold constants for classifying resource utilization:

1. **CPU Usage Thresholds**:
   - Below 15% is considered idle
   - Below 50% is considered normal load
   - Below 80% is considered high but acceptable
   - Above 90% is considered critically high

2. **Memory Percentage Thresholds**:
   - Below 50% is considered low utilization
   - Below 70% is considered normal utilization
   - Below 85% is considered high but acceptable
   - Above 95% is considered critically high

3. **Absolute Memory Thresholds**:
   - Systems should have at least 2GB of free memory

## Key Analysis Methods

The `PerformanceDataAnalyzer` implements several key methods:

### Section Name Property

```python
@property
def section_name(self) -> str:
    return "PerformanceData"
```

### Optional Input Files Property

```python
@property
def optional_input_files(self) -> Set[str]:
    # These related sections can provide additional context
    return {"RunningServices.json", "StartupPrograms.json", "DiskSpace.json"}
```

This indicates that the Performance Data analyzer may use additional data from the Running Services, Startup Programs, and Disk Space collectors for enhanced analysis.

### Extract Key Metrics Method

```python
def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
    """
    Extract key metrics from performance data.
    
    Args:
        section_data: The performance data
        
    Returns:
        Dictionary of key metrics
    """
    if not isinstance(section_data, dict):
        return {"error": "Invalid performance data format"}
    
    # Extract CPU metrics
    processor_usage = section_data.get("ProcessorUsage")
    cpu_status = "Unknown"
    if processor_usage is not None:
        if processor_usage <= self.CPU_IDLE:
            cpu_status = "Idle"
        elif processor_usage <= self.CPU_NORMAL:
            cpu_status = "Normal"
        elif processor_usage <= self.CPU_HIGH:
            cpu_status = "High"
        elif processor_usage <= self.CPU_CRITICAL:
            cpu_status = "Very High"
        else:
            cpu_status = "Critical"
    
    # Extract memory metrics
    memory_data = section_data.get("Memory", {})
    if not isinstance(memory_data, dict):
        memory_data = {}
            
    total_memory_gb = memory_data.get("TotalGB")
    used_memory_gb = memory_data.get("UsedGB")
    free_memory_gb = memory_data.get("FreeGB")
    memory_percent_used = memory_data.get("PercentUsed")
    
    memory_status = "Unknown"
    if memory_percent_used is not None:
        if memory_percent_used <= self.MEMORY_LOW:
            memory_status = "Low"
        elif memory_percent_used <= self.MEMORY_NORMAL:
            memory_status = "Normal"
        elif memory_percent_used <= self.MEMORY_HIGH:
            memory_status = "High"
        elif memory_percent_used <= self.MEMORY_CRITICAL:
            memory_status = "Very High"
        else:
            memory_status = "Critical"
    
    # Check if memory is below minimum threshold
    low_memory_warning = False
    if free_memory_gb is not None and free_memory_gb < self.MIN_FREE_MEMORY:
        low_memory_warning = True
    
    # Calculate memory pressure
    memory_pressure = "Unknown"
    if memory_percent_used is not None and processor_usage is not None:
        # High memory usage with high CPU can indicate memory pressure
        if memory_percent_used > self.MEMORY_HIGH and processor_usage > self.CPU_HIGH:
            memory_pressure = "High"
        elif memory_percent_used > self.MEMORY_NORMAL or processor_usage > self.CPU_NORMAL:
            memory_pressure = "Moderate"
        else:
            memory_pressure = "Low"
    
    return {
        "cpu": {
            "usage_percent": processor_usage,
            "status": cpu_status
        },
        "memory": {
            "total_gb": total_memory_gb,
            "used_gb": used_memory_gb,
            "free_gb": free_memory_gb,
            "percent_used": memory_percent_used,
            "status": memory_status,
            "low_memory_warning": low_memory_warning
        },
        "system_pressure": {
            "memory_pressure": memory_pressure
        }
    }
```

This method analyzes the performance data to:
1. Determine CPU utilization status based on thresholds
2. Assess memory utilization status
3. Check for low memory warnings
4. Calculate memory pressure based on combined CPU and memory utilization
5. Return a structured metrics object with categorized status information

### Create Prompt Method

```python
def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Create a prompt for performance data analysis.
    
    Args:
        section_data: The performance data
        additional_data: Optional additional data from other sections
        
    Returns:
        Formatted prompt for performance data analysis
    """
    # Format the data as JSON
    import json
    section_json = json.dumps(section_data, ensure_ascii=False)
    
    # Extract key metrics for enhanced prompting
    metrics = self.extract_key_metrics(section_data)
    
    # Format CPU information
    cpu_info = "CPU Usage: "
    if metrics["cpu"]["usage_percent"] is not None:
        cpu_info += f"{metrics['cpu']['usage_percent']}% ({metrics['cpu']['status']})"
    else:
        cpu_info += "Unknown"
    
    # Format memory information
    memory_info = "Memory Usage: "
    if metrics["memory"]["percent_used"] is not None:
        memory_info += f"{metrics['memory']['percent_used']}% ({metrics['memory']['status']})"
        memory_info += f"\nTotal Memory: {metrics['memory']['total_gb']} GB"
        memory_info += f"\nUsed Memory: {metrics['memory']['used_gb']} GB"
        memory_info += f"\nFree Memory: {metrics['memory']['free_gb']} GB"
    else:
        memory_info += "Unknown"
    
    # Prepare warnings section if needed
    warnings = ""
    if metrics["memory"]["low_memory_warning"]:
        warnings += f"\nWARNING: System has less than {self.MIN_FREE_MEMORY} GB of free memory, which may affect performance."
    
    if metrics["cpu"]["status"] == "Critical":
        warnings += f"\nWARNING: CPU usage is critically high, which may indicate a problem or resource contention."
    
    if metrics["memory"]["status"] == "Critical":
        warnings += f"\nWARNING: Memory usage is critically high, which may lead to swapping and reduced performance."
    
    # Add disk context if available
    disk_context = ""
    if additional_data and "DiskSpace" in additional_data:
        disk_data = additional_data["DiskSpace"]
        if isinstance(disk_data, list) and len(disk_data) > 0:
            # Try to find system drive
            system_drive = None
            for drive in disk_data:
                if drive.get("Name") == "C":
                    system_drive = drive
                    break
            
            if system_drive:
                disk_context += f"\nSystem Drive (C:) Free Space: {system_drive.get('FreeGB', 'Unknown')} GB ({system_drive.get('PercentFree', 'Unknown')}% free)"
                
                # Check if free space is low
                if system_drive.get('PercentFree', 100) < 10:
                    disk_context += "\nNOTE: Low free space on system drive may affect performance if virtual memory is needed."
    
    # Add services context if available
    services_context = ""
    if additional_data and "RunningServices" in additional_data:
        services_data = additional_data["RunningServices"]
        if isinstance(services_data, list):
            services_context += f"\nRunning Services: {len(services_data)} services active"
    
    # Build specific analysis instructions
    prompt = f"""
Analyze the system performance data to identify bottlenecks, risks, and optimization opportunities:

1. Performance assessment
   - Evaluate CPU utilization patterns
   - Assess memory usage and potential memory pressure
   - Identify performance bottlenecks
   - Determine if the system has adequate resources for its workload

2. Resource utilization
   - Analyze if CPU resources are being efficiently used
   - Evaluate if memory allocation is appropriate
   - Identify potential resource contention
   - Assess if virtual memory/page file might be in use

3. Optimization recommendations
   - Suggest ways to improve system performance
   - Recommend resource allocation adjustments if needed
   - Identify potential hardware upgrade needs
   - Suggest software configuration changes to optimize performance

4. Risk evaluation
   - Identify potential stability risks due to resource exhaustion
   - Assess long-term sustainability of current resource usage
   - Evaluate impact of current performance on user experience
   - Identify processes or services that may need resource constraints

Key metrics:
- {cpu_info}
- {memory_info}
- System Pressure: {metrics['system_pressure']['memory_pressure']}
{warnings}

Additional context:{disk_context}{services_context}

The performance data for analysis:
```json
{section_json}
```
"""
    return prompt
```

This method creates a specialized prompt for the LLM that includes:
1. Specific analysis instructions for performance data
2. Formatted metrics and status information
3. Warning flags for critical conditions
4. Additional context from disk space and services data if available
5. The raw performance data in JSON format

The prompt focuses on four key areas:
- Performance assessment
- Resource utilization analysis
- Optimization recommendations
- Risk evaluation

## Prompt Sources

Looking at the `section_prompts.py` file, there is a specialized prompt for Performance Data analysis:

```python
# Section-specific analysis prompts
SECTION_PROMPTS = {
    # ... [other section prompts] ...
    "PerformanceData": """
Analyze the performance data:
1. Evaluate CPU usage patterns and identify bottlenecks
2. Analyze memory usage and identify potential memory leaks
3. Check for resource-intensive processes
4. Suggest hardware upgrade considerations if appropriate
5. Provide performance optimization recommendations
""",
    # ... [other section prompts] ...
}
```

This predefined prompt aligns with the more detailed one generated by the `create_prompt` method.

## Data Structure

According to the documentation, the Performance Data structure includes:

```json
{
  "Timestamp": "2025-03-10T15:30:45.0000000Z",
  "ComputerName": "HOSTNAME",
  "Data": {
    "ProcessorUsage": 12.34,
    "Memory": {
      "TotalGB": 32.00,
      "FreeGB": 18.45,
      "UsedGB": 13.55,
      "PercentUsed": 42.34
    }
  }
}
```

Key fields that are analyzed include:
- `ProcessorUsage` - Current CPU usage percentage across all cores
- `Memory.TotalGB` - Total physical memory installed
- `Memory.FreeGB` - Available physical memory
- `Memory.UsedGB` - Memory currently in use
- `Memory.PercentUsed` - Percentage of total memory currently in use

## Output Structure

The output of the Performance Data analyzer is stored in `PerformanceDataAnalysis.json`. Based on the standard output schema used throughout the project, the expected structure is:

```json
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Description of the issue",
      "description": "Detailed explanation of the problem",
      "recommendation": "Suggested action to resolve the issue"
    }
  ],
  "optimizations": [
    {
      "impact": "high|medium|low",
      "title": "Optimization opportunity",
      "description": "Explanation of the optimization",
      "recommendation": "Steps to implement the optimization"
    }
  ],
  "summary": "Overall assessment of system performance"
}
```

## Key Analysis Areas

Based on the prompt structure and documentation in `13-performance-data.md`, the analyzer focuses on:

1. **CPU Utilization Assessment**:
   - Analyzing current processor usage levels
   - Categorizing utilization against defined thresholds
   - Identifying potential CPU bottlenecks
   - Evaluating CPU efficiency and contention

2. **Memory Usage Evaluation**:
   - Assessing memory allocation and availability
   - Checking for low memory conditions
   - Evaluating memory pressure
   - Identifying potential memory leaks or excessive consumption

3. **System Pressure Analysis**:
   - Calculating combined resource pressure indicators
   - Identifying stability risks due to resource exhaustion
   - Assessing long-term sustainability of current usage patterns
   - Evaluating overall system load balance

4. **Optimization Recommendations**:
   - Suggesting performance improvement strategies
   - Recommending resource allocation adjustments
   - Identifying potential hardware upgrade needs
   - Providing software configuration optimization advice

## Collection Methodology

According to the documentation, the performance data collector uses two primary methods:

1. **Performance Counters**: Windows performance counters are queried for processor usage statistics
2. **CIM/WMI Queries**: The Windows Management Instrumentation layer is used to gather detailed memory information

The collector employs fallback mechanisms for robustness, ensuring consistent data structure even if a specific collection method fails.

## Correlation with Other Analyzers

The Performance Data analyzer complements and correlates with:

- **RunningServices**: Identifies services that may be consuming system resources
- **StartupPrograms**: Documents programs that launch at startup and may affect system performance
- **DiskSpace**: Provides context about storage capacity alongside memory capacity
- **InstalledPrograms**: Documents applications that may be consuming resources
- **WindowsFeatures**: Some Windows features can significantly impact system performance

## LLM Interaction Flow

1. The analyzer loads the `PerformanceData.json` data
2. It extracts and categorizes key metrics from the data
3. It incorporates additional context from related sections if available
4. It creates a specialized prompt with detailed instructions and formatted metrics
5. The prompt is sent to the LLM via the API
6. The LLM response is parsed and formatted into `PerformanceDataAnalysis.json`
7. The raw interaction is saved in `PerformanceData_llm_interaction.json`

## Current Limitations

- Sampling nature of the data (single point in time)
- Limited to CPU and memory metrics without disk or network performance
- No process-level breakdown of resource consumption
- No historical data for trend analysis
- Aggregated CPU metrics without per-core details

## Improvement Opportunities

Based on the documentation in `13-performance-data.md`, potential improvements include:

1. Adding per-core processor metrics to identify imbalanced workloads
2. Expanding memory details to include page file usage and cache allocation
3. Adding basic disk performance metrics (read/write operations, queue length)
4. Including network throughput statistics for a more complete resource picture
5. Adding identification of top CPU and memory consuming processes
6. Including historical context with minimum, maximum, and average values
7. Adding resource pressure indicators like memory hard faults or processor queue length
