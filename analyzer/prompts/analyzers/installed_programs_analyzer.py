"""
Installed programs analyzer
"""

from typing import Dict, Any, Optional, Set
import re
from datetime import datetime

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


@SectionAnalyzerRegistry.register
class InstalledProgramsAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for installed programs data.
    """
    
    # Known categories of software for classification
    SOFTWARE_CATEGORIES = {
        "security": [
            "antivirus", "firewall", "protection", "security", "defender", 
            "malware", "encrypt", "vpn", "norton", "mcafee", "kaspersky", 
            "avast", "bitdefender"
        ],
        "development": [
            "visual studio", "vscode", "python", "node", "npm", "git", "docker", 
            "kubernetes", "compiler", "ide", "java", "sdk", "development kit",
            "android studio", "xcode", "intellij", "pycharm", "eclipse"
        ],
        "utilities": [
            "driver", "utility", "tool", "cleanup", "monitor", "backup", "restore",
            "system", "maintenance", "manager", "cleaner", "optimizer"
        ],
        "bloatware": [
            "toolbar", "coupon", "offer", "trial", "shopping assistant", "browser helper",
            "optimizer", "cleaner", "speedup", "pc tune", "free gift", "win prize"
        ]
    }
    
    @property
    def section_name(self) -> str:
        return "InstalledPrograms"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Optionally use StartupPrograms.json for correlation
        return {"StartupPrograms.json"}
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from installed programs data.
        
        Args:
            section_data: The installed programs section data
            
        Returns:
            Dictionary of key metrics
        """
        if not isinstance(section_data, list):
            return {"total_programs": 0}
            
        # Count total programs
        total_programs = len(section_data)
        
        # Count programs by category
        categorized_counts = {category: 0 for category in self.SOFTWARE_CATEGORIES}
        
        for program in section_data:
            program_name = program.get("Name", "").lower()
            
            for category, keywords in self.SOFTWARE_CATEGORIES.items():
                if any(keyword in program_name for keyword in keywords):
                    categorized_counts[category] += 1
        
        # Get recent installations (in the last 30 days)
        recent_installations = 0
        try:
            today = datetime.now()
            for program in section_data:
                install_date = program.get("InstallDate")
                if install_date and re.match(r'^\d{8}$', install_date):
                    # Convert YYYYMMDD to datetime
                    install_datetime = datetime.strptime(install_date, "%Y%m%d")
                    if (today - install_datetime).days <= 30:
                        recent_installations += 1
        except Exception:
            # If date parsing fails, skip this metric
            pass
        
        return {
            "total_programs": total_programs,
            "recent_installations": recent_installations,
            "security_software": categorized_counts["security"],
            "development_tools": categorized_counts["development"],
            "utility_software": categorized_counts["utilities"],
            "potential_bloatware": categorized_counts["bloatware"]
        }
    
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for installed programs analysis.
        
        Args:
            section_data: The installed programs section data
            additional_data: Optional additional data from other sections
            
        Returns:
            Formatted prompt for installed programs analysis
        """
        # Format the data as JSON
        import json
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Add startup programs context if available
        startup_context = ""
        if additional_data and "StartupPrograms" in additional_data:
            startup_programs = additional_data["StartupPrograms"]
            startup_json = json.dumps(startup_programs, ensure_ascii=False)
            if len(startup_json) > 1000:  # Keep startup context smaller
                startup_json = startup_json[:1000] + "... [truncated]"
            startup_context = f"""
Also consider the following startup programs that run automatically:
```json
{startup_json}
```
"""
        
        # Build specific analysis instructions
        prompt = f"""
Analyze the installed programs data:

1. Identify outdated software that could pose security risks
2. Look for potentially unwanted programs or bloatware
3. Check for software conflicts or redundant applications
4. Identify suspicious or unusual software installations
5. Note any missing essential security or utility software
6. Check for recently installed software that might be relevant

Key metrics:
- Total installed programs: {metrics['total_programs']}
- Recent installations (last 30 days): {metrics['recent_installations']}
- Security software detected: {metrics['security_software']}
- Development tools detected: {metrics['development_tools']}
- Utility software detected: {metrics['utility_software']}
- Potential bloatware detected: {metrics['potential_bloatware']}

The installed programs data for analysis:
```json
{section_json}
```
{startup_context}
"""
        return prompt