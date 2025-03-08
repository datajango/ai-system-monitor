"""
Disk space analyzer
"""

from typing import Dict, List, Any, Optional, Set

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


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
    
    # Common drive letters and their typical uses
    COMMON_DRIVE_USAGE = {
        "C": "System",
        "D": "Data/Applications",
        "E": "External/Optical",
        "X": "Recovery",
        "Z": "Network"
    }
    
    @property
    def section_name(self) -> str:
        return "DiskSpace"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Could optionally use other data for context
        return {"PerformanceData.json", "WindowsFeatures.json"}
    
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
        
        for drive in section_data:
            drive_letter = drive.get("Name", "Unknown")
            free_percent = drive.get("PercentFree", 0)
            free_gb = drive.get("FreeGB", 0)
            total_gb = drive.get("TotalGB", 0)
            used_gb = drive.get("UsedGB", 0)
            
            # Accumulate totals
            total_space_gb += total_gb
            total_used_gb += used_gb
            total_free_gb += free_gb
            
            # Check for low space
            status = "OK"
            if free_percent <= self.CRITICAL_THRESHOLD or (drive_letter == "C" and free_gb < self.SYSTEM_MIN_FREE_GB):
                status = "CRITICAL"
                drives_critical.append(drive_letter)
            elif free_percent <= self.WARNING_THRESHOLD:
                status = "WARNING"
                drives_low_space.append(drive_letter)
            elif free_percent <= self.ATTENTION_THRESHOLD:
                status = "ATTENTION"
                drives_low_space.append(drive_letter)
            
            # Is this likely the system drive?
            is_system = drive_letter == "C"
            if is_system:
                system_drive = {
                    "letter": drive_letter,
                    "free_gb": free_gb,
                    "total_gb": total_gb,
                    "percent_free": free_percent,
                    "status": status
                }
            
            drive_metrics.append({
                "letter": drive_letter,
                "free_gb": free_gb,
                "total_gb": total_gb,
                "percent_free": free_percent,
                "status": status,
                "is_system": is_system
            })
        
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
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Format drive metrics for display
        drives_info = ""
        for drive in metrics["drive_metrics"]:
            status_label = f" [{drive['status']}]" if drive['status'] != "OK" else ""
            system_label = " (System Drive)" if drive['is_system'] else ""
            drives_info += f"  - Drive {drive['letter']}{system_label}: {drive['free_gb']:.2f} GB free out of {drive['total_gb']:.2f} GB ({drive['percent_free']:.1f}% free){status_label}\n"
        
        # Prepare warnings section if needed
        warnings = ""
        if metrics["drives_critical"]:
            critical_drives = ", ".join(metrics["drives_critical"])
            warnings += f"\nCRITICAL: The following drives have critically low free space: {critical_drives}"
        
        if metrics["drives_low_space"]:
            low_space_drives = [d for d in metrics["drives_low_space"] if d not in metrics["drives_critical"]]
            if low_space_drives:
                low_space_str = ", ".join(low_space_drives)
                warnings += f"\nWARNING: The following drives have low free space: {low_space_str}"
        
        # System drive specific warning
        if metrics["system_drive"] and metrics["system_drive"]["status"] != "OK":
            sys_drive = metrics["system_drive"]
            warnings += f"\nIMPORTANT: System drive {sys_drive['letter']} has {sys_drive['free_gb']:.2f} GB free ({sys_drive['percent_free']:.1f}%). System performance may be degraded."
        
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