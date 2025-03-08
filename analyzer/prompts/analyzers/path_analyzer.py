"""
Path environment variable analyzer
"""

from typing import Dict, Any, Optional, Set

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


@SectionAnalyzerRegistry.register
class PathAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for PATH environment variable data.
    """
    
    @property
    def section_name(self) -> str:
        return "Path"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Optionally use Environment.json for additional context
        return {"Environment.json"}
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from PATH data.
        
        Args:
            section_data: The PATH section data
            
        Returns:
            Dictionary of key metrics
        """
        total_paths = len(section_data) if isinstance(section_data, list) else 0
        invalid_paths = sum(1 for p in section_data if not p.get('Exists', True)) if isinstance(section_data, list) else 0
        
        return {
            "total_path_entries": total_paths,
            "invalid_path_entries": invalid_paths,
            "valid_path_entries": total_paths - invalid_paths
        }
    
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for PATH analysis.
        
        Args:
            section_data: The PATH section data
            additional_data: Optional additional data from other sections
            
        Returns:
            Formatted prompt for PATH analysis
        """
        # Format the data as JSON
        import json
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Build specific analysis instructions
        prompt = f"""
Analyze the PATH environment variable data:

1. Check for invalid paths that don't exist (marked with "Exists": false)
2. Identify potential security risks:
   - Writable directories that could allow privilege escalation
   - Non-system directories appearing before system directories
   - Unusual or suspicious path entries
3. Look for duplicate entries that waste resources
4. Check for proper ordering of important entries (Windows system directories should come first)
5. Identify unnecessary or obsolete entries

Key metrics:
- Total PATH entries: {metrics['total_path_entries']}
- Invalid PATH entries: {metrics['invalid_path_entries']}
- Valid PATH entries: {metrics['valid_path_entries']}

The PATH data for analysis:
```json
{section_json}
```
"""
        return prompt