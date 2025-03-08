"""
Performance data analyzer
"""

from typing import Dict, List, Any, Optional, Set

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


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
    
    @property
    def section_name(self) -> str:
        return "PerformanceData"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # These related sections can provide additional context
        return {"RunningServices.json", "StartupPrograms.json", "DiskSpace.json"}
    
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