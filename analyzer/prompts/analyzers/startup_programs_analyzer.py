"""
Startup programs analyzer
"""

from typing import Dict, Any, Optional, Set
import re

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


@SectionAnalyzerRegistry.register
class StartupProgramsAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for startup programs data.
    """
    
    # Suspicious keywords that might indicate unwanted startup items
    SUSPICIOUS_KEYWORDS = [
        "update", "helper", "daemon", "tray", "scheduler", "manager", "monitor",
        "launch", "startup", "boot", "assistant", "notif", "agent", "sync",
        "cloud", "cache", "tune", "speedup", "optimize", "clean"
    ]
    
    # Common legitimate startup programs
    COMMON_LEGITIMATE = [
        "OneDrive", "Dropbox", "Google Drive", "Microsoft Teams", "Slack",
        "Discord", "Spotify", "Steam", "Epic Games", "Windows Security",
        "Realtek Audio", "NVIDIA", "AMD", "Intel", "Synaptics", "Dell",
        "HP", "Lenovo", "Apple", "iCloud", "Adobe Creative Cloud"
    ]
    
    # Known high-impact startup programs (can slow boot times)
    HIGH_IMPACT_PROGRAMS = [
        "Adobe", "Teams", "Skype", "Steam", "Epic", "Defender", "Antivirus",
        "iTunes", "iCloud", "Spotify", "Backup", "Sync"
    ]
    
    @property
    def section_name(self) -> str:
        return "StartupPrograms"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Optionally use RegistrySettings.json and InstalledPrograms.json for correlation
        return {"RegistrySettings.json", "InstalledPrograms.json"}
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from startup programs data.
        
        Args:
            section_data: The startup programs section data
            
        Returns:
            Dictionary of key metrics
        """
        if not isinstance(section_data, list):
            return {"total_startup_items": 0}
            
        # Count total startup items
        total_items = len(section_data)
        
        # Count by location
        locations = {}
        for item in section_data:
            location = item.get("Location", "Unknown")
            locations[location] = locations.get(location, 0) + 1
        
        # Count potentially suspicious items
        suspicious_count = 0
        for item in section_data:
            name = item.get("Name", "").lower()
            command = item.get("Command", "").lower()
            
            # Check against suspicious keywords
            if any(keyword.lower() in name or keyword.lower() in command 
                  for keyword in self.SUSPICIOUS_KEYWORDS):
                # Exclude known legitimate programs
                if not any(legitimate.lower() in name or legitimate.lower() in command 
                          for legitimate in self.COMMON_LEGITIMATE):
                    suspicious_count += 1
        
        # Count high-impact items that might slow boot time
        high_impact_count = 0
        for item in section_data:
            name = item.get("Name", "").lower()
            command = item.get("Command", "").lower()
            
            if any(impact.lower() in name or impact.lower() in command 
                  for impact in self.HIGH_IMPACT_PROGRAMS):
                high_impact_count += 1
        
        return {
            "total_startup_items": total_items,
            "locations": locations,
            "suspicious_items_count": suspicious_count,
            "high_impact_items_count": high_impact_count
        }
    
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for startup programs analysis.
        
        Args:
            section_data: The startup programs section data
            additional_data: Optional additional data from other sections
            
        Returns:
            Formatted prompt for startup programs analysis
        """
        # Format the data as JSON
        import json
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Format locations for display
        locations_str = "\n".join([f"  - {loc}: {count}" for loc, count in metrics["locations"].items()])
        
        # Add registry context if available
        registry_context = ""
        if additional_data and "RegistrySettings" in additional_data:
            registry_data = additional_data["RegistrySettings"]
            # Extract only startup-related registry entries if available
            if isinstance(registry_data, dict) and "StartupPrograms" in registry_data:
                registry_startup = registry_data["StartupPrograms"]
                registry_json = json.dumps(registry_startup, ensure_ascii=False)
                if len(registry_json) > 1000:  # Keep context smaller
                    registry_json = registry_json[:1000] + "... [truncated]"
                registry_context = f"""
Also consider the following registry startup entries that may provide additional context:
```json
{registry_json}
```
"""
            
        # Add installed programs context if available
        installed_context = ""
        if additional_data and "InstalledPrograms" in additional_data:
            # We don't need all programs, just provide a count
            installed_count = len(additional_data["InstalledPrograms"]) if isinstance(additional_data["InstalledPrograms"], list) else "unknown"
            installed_context = f"\nThe system has approximately {installed_count} programs installed."
        
        # Build specific analysis instructions
        prompt = f"""
Analyze the startup programs data to identify potential issues, security risks, and performance impacts:

1. Identify applications that could slow system boot time
   - Look for resource-intensive applications
   - Note applications that might not need to start automatically
   - Check for redundant startup items serving similar functions

2. Assess security implications
   - Look for suspicious or unrecognized startup entries
   - Identify potential autorun malware or unwanted software
   - Note unusual command line parameters or file locations

3. Evaluate performance impact
   - Categorize startup items by their likely impact on boot time
   - Identify items that could be delayed or disabled to improve boot time
   - Look for applications that should be configured to start on-demand instead

4. Check for configuration issues
   - Identify broken startup entries pointing to missing files
   - Look for duplicated entries across different startup locations
   - Note unclear or ambiguous startup command lines

Key metrics:
- Total startup items: {metrics['total_startup_items']}
- Items by location:
{locations_str}
- Potentially suspicious items: {metrics['suspicious_items_count']}
- High-impact items (may slow boot): {metrics['high_impact_items_count']}
{installed_context}

The startup programs data for analysis:
```json
{section_json}
```
{registry_context}
"""
        return prompt