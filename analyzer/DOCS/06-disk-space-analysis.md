# Disk Space Analyzer Component

## Overview

The Disk Space Analyzer is a specialized component of the System State Analyzer that examines storage volumes, disk usage, and capacity planning issues on the system. This component analyzes data collected from the `DiskSpace.json` file produced by the System State Collector.

## Input Data Source

**Filename**: `DiskSpace.json`

According to the documentation in `06-disk-space.md`, the Disk Space collector gathers information about:
- Physical drives and logical volumes
- Network mapped drives
- Removable media
- Disk capacity, usage, and free space metrics
- Percentage of available space

The collection is performed by the `DiskCollector.ps1` script, which leverages PowerShell's `Get-PSDrive` cmdlet to gather information about file system drives.

## Analyzer Implementation

The Disk Space analyzer is implemented as a dedicated class in the project. Looking at the source code, we can see the implementation in:

```python
@SectionAnalyzerRegistry.register
class DiskSpaceAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for disk space data.
    """
    
    # Thresholds for disk space warnings (in percentage free)
    CRITICAL_THRESHOLD = 5    # Less than 5% free is critical
    WARNING_THRESHOLD = 10    # Less than 10% free is warning
    ATTENTION_THRESHOLD = 15  # Less than 15% free needs attention
    
    # Thresholds for specific drive types (in GB)
    SSD_MIN_FREE_GB = 10      # SSDs should have at least 10GB free for optimal performance
    SYSTEM_MIN_FREE_GB = 20   # System drives should have more free space
```

The analyzer extends the `BaseSectionAnalyzer` class and registers itself with the `SectionAnalyzerRegistry` using the decorator pattern.

The class defines threshold constants for disk space warnings:
- Critical level: Less than 5% free space
- Warning level: Less than 10% free space
- Attention level: Less than 15% free space

It also defines minimum free space thresholds for specific drive types:
- SSDs should have at least 10GB free
- System drives should have at least 20GB free

## Key Analysis Methods

The `DiskSpaceAnalyzer` class implements several key methods:

1. `section_name` property that returns "DiskSpace"
2. `extract_key_metrics` method that calculates important disk space metrics
3. `create_prompt` method that generates a specialized prompt for LLM analysis

### Extract Key Metrics Method

The `extract_key_metrics` method processes the disk space data to extract meaningful metrics:

```python
def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
    """
    Extract key metrics from disk space data.
    
    Args:
        section_data: The disk space section data
        
    Returns:
        Dictionary of key metrics
    """
    if not isinstance(section_data, list):
        return {"total_drives": 0}
    
    # Count total drives
    total_drives = len(section_data)
    
    # Calculate metrics for each drive
    drive_metrics = []
    system_drive = None
    
    total_space_gb = 0
    total_used_gb = 0
    total_free_gb = 0
    
    drives_low_space = []
    drives_critical = []
    
    # ... [processing logic for drive metrics] ...
    
    return {
        "total_drives": total_drives,
        "drive_metrics": drive_metrics,
        "system_drive": system_drive,
        "total_space_gb": total_space_gb,
        "total_used_gb": total_used_gb,
        "total_free_gb": total_free_gb,
        "drives_low_space": drives_low_space,
        "drives_critical": drives_critical,
        "overall_space_free_percent": (total_free_gb / total_space_gb * 100) if total_space_gb > 0 else 0
    }
```

This method calculates:
- Total number of drives
- Detailed metrics for each drive
- System drive information
- Total space, used space, and free space across all drives
- Lists of drives with low space or critical space issues
- Overall percentage of free space

### Create Prompt Method

The `create_prompt` method generates a specialized prompt for the LLM:

```python
def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
    """
    Create a prompt for disk space analysis.
    
    Args:
        section_data: The disk space section data
        additional_data: Optional additional data from other sections
        
    Returns:
        Formatted prompt for disk space analysis
    """
    # Format the data as JSON
    import json
    section_json = json.dumps(section_data, ensure_ascii=False)
    
    # Truncate very large sections to avoid hitting token limits
    if len(section_json) > 10000:
        section_json = section_json[:10000] + "... [truncated for length]"
    
    # Extract key metrics for enhanced prompting
    metrics = self.extract_key_metrics(section_data)
    
    # Format drive metrics for display
    drives_info = ""
    for drive in metrics["drive_metrics"]:
        status_label = f" [{drive['status']}]" if drive['status'] != "OK" else ""
        system_label = " (System Drive)" if drive['is_system'] else ""
        drives_info += f"  - Drive {drive['letter']}{system_label}: {drive['free_gb']:.2f} GB free out of {drive['total_gb']:.2f} GB ({drive['percent_free']:.1f}% free){status_label}\n"
    
    # ... [additional formatting for warnings and other information] ...
    
    # Build specific analysis instructions
    prompt = f"""
Analyze the disk space data to identify potential issues, risks, and optimization opportunities:

1. Space utilization assessment
   - Identify drives with critically low free space
   - Assess if the system drive has adequate free space
   - Evaluate overall storage allocation across drives
   - Check for imbalanced space utilization among drives

2. Risk evaluation
   - Identify potential risks due to low free space
   - Assess if low space could impact system stability or performance
   - Calculate how quickly drives might fill up based on current usage patterns
   - Evaluate if there are backup/recovery partition space concerns

3. Optimization recommendations
   - Suggest drives that may need cleanup or expansion
   - Recommend potential file relocation strategies
   - Identify opportunities for storage reallocation
   - Suggest disk cleanup approaches based on drive usage patterns

4. Performance implications
   - Assess if any drives are nearing capacity thresholds that could impact performance (especially SSDs)
   - Evaluate if the system drive has sufficient space for virtual memory and temporary files
   - Identify if drive fragmentation might be an issue based on free space patterns

Key metrics:
- Total drives: {metrics['total_drives']}
- Total storage: {metrics['total_space_gb']:.2f} GB
- Total used: {metrics['total_used_gb']:.2f} GB
- Total free: {metrics['total_free_gb']:.2f} GB
- Overall free space: {metrics['overall_space_free_percent']:.1f}%

Drive details:
{drives_info}{warnings}

The disk space data for analysis:
```json
{section_json}
```
"""
    return prompt
```

This method:
1. Formats the disk space data as JSON
2. Truncates if necessary to avoid token limits
3. Extracts key metrics using the `extract_key_metrics` method
4. Formats detailed drive information
5. Builds a specialized prompt that includes:
   - Analysis instructions
   - Key metrics about total storage and free space
   - Detailed drive information
   - Warning flags for critical issues
   - The raw JSON data for reference

## Output Structure

The output of the Disk Space analyzer is stored in `DiskSpaceAnalysis.json`. Based on the project's analysis patterns, the expected structure is:

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
  "summary": "Overall assessment of disk space utilization"
}
```

## Key Analysis Areas

Based on the prompt structure and the documentation in `06-disk-space.md`, the analyzer focuses on:

1. **Space Utilization Assessment**:
   - Identifying drives with critically low free space
   - Assessing system drive adequacy
   - Evaluating overall storage allocation patterns
   - Checking for imbalanced utilization

2. **Risk Evaluation**:
   - Identifying potential risks from low free space
   - Assessing impact on system stability and performance
   - Projecting future space requirements
   - Evaluating backup/recovery partition concerns

3. **Optimization Recommendations**:
   - Suggesting cleanup or expansion strategies
   - Recommending file relocation approaches
   - Identifying storage reallocation opportunities
   - Suggesting disk cleanup methods

4. **Performance Implications**:
   - Assessing capacity thresholds for performance impacts
   - Evaluating system drive space for virtual memory
   - Identifying potential fragmentation issues

## Correlation with Other Analyzers

The Disk Space analyzer complements and correlates with:

- **PerformanceData**: Provides context about system resource utilization
- **InstalledPrograms**: Helps identify applications consuming significant disk space
- **WindowsFeatures**: Some features may impact disk space usage
- **WindowsUpdates**: Update caches and files can consume disk space

## LLM Interaction Flow

1. The analyzer loads the `DiskSpace.json` data
2. It calculates key metrics about drive usage
3. It creates a specialized prompt with detailed instructions and metrics
4. The prompt is sent to the LLM via the API
5. The LLM response is parsed and formatted into `DiskSpaceAnalysis.json`
6. The raw interaction is saved in `DiskSpace_llm_interaction.json`

## Current Limitations

- No file type or content analysis
- Cannot identify what is consuming the space
- Limited historical data for trend analysis
- No distinction between physical disks and logical volumes

## Improvement Opportunities

Based on the documentation in `06-disk-space.md`, potential improvements include:

1. Adding physical disk information and distinguishing between physical disks and logical volumes
2. Including file system type details (NTFS, FAT32, exFAT, etc.)
3. Adding volume labels for easier identification
4. Supporting mount points (volumes mounted to folders)
5. Classifying drives by type (local, removable, network, etc.)
6. Adding space trend metrics between snapshots
7. Incorporating disk health indicators
