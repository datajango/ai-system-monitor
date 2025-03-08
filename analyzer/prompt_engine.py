"""
Prompt generation engine for LM Studio Analyzer
"""

import json
import logging
from typing import Dict, List, Any, Optional

from prompts.section_analyzers_registry import SectionAnalyzerRegistry
from prompts.base_section_analyzer import BaseSectionAnalyzer

logger = logging.getLogger(__name__)

class PromptEngine:
    """
    Generates prompts for LM Studio based on snapshot data.
    """
    
    def __init__(self):
        """
        Initialize the prompt engine.
        """
        # Ensure all analyzers are loaded and registered
        import prompts.analyzers
    
    def create_section_prompt(self, section_name: str, section_data: Any, all_sections_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a section-specific prompt for analysis.
        
        Args:
            section_name: Name of the section
            section_data: Data for the section
            all_sections_data: Optional dictionary of all sections' data for cross-reference
            
        Returns:
            Analysis prompt specific to this section
        """
        # Get the appropriate analyzer for this section
        analyzer = SectionAnalyzerRegistry.get_analyzer(section_name)
        
        if analyzer is None:
            # Use a generic fallback approach if no specific analyzer is registered
            return self._create_generic_prompt(section_name, section_data)
        
        # Collect any additional data the analyzer might need
        additional_data = {}
        if all_sections_data:
            for file_name in analyzer.optional_input_files:
                # Convert file name to section name (remove .json)
                opt_section = file_name.replace('.json', '')
                if opt_section in all_sections_data:
                    additional_data[opt_section] = all_sections_data[opt_section]
        
        # Generate the prompt using the specialized analyzer
        return analyzer.build_prompt_wrapper(section_data, additional_data)
    
    def _create_generic_prompt(self, section_name: str, section_data: Any) -> str:
        """
        Create a generic prompt for sections without specific analyzers.
        
        Args:
            section_name: Name of the section
            section_data: Data for the section
            
        Returns:
            Generic analysis prompt
        """
        # Format the data as JSON
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
            
        # Build the generic prompt
        prompt = f"""
You are analyzing the '{section_name}' section of a Windows system state snapshot.

Analyze this section data:
1. Identify potential issues or security risks
2. Find optimization opportunities 
3. Look for unusual or suspicious configurations
4. Suggest concrete improvements
5. Prioritize recommendations by importance

The data for this section is:
```json
{section_json}
```

Provide your analysis as JSON with the following structure:
{{
  "issues": [
    {{
      "severity": "critical|high|medium|low",
      "title": "Brief description of the issue",
      "description": "Detailed explanation",
      "recommendation": "Specific action to resolve or improve"
    }}
  ],
  "optimizations": [
    {{
      "impact": "high|medium|low",
      "title": "Brief description of the optimization",
      "description": "Detailed explanation",
      "recommendation": "Specific action to implement"
    }}
  ],
  "summary": "Brief overall assessment of this section"
}}

Important: Respond ONLY with valid JSON, no other text before or after.
"""
        return prompt
    
    def create_summary_prompt(self, analysis_result: Dict[str, Any]) -> str:
        """
        Generate a prompt to create an overall summary of the system based
        on the individual section analyses.
        
        Args:
            analysis_result: The complete analysis results
            
        Returns:
            Prompt for generating a summary
        """
        # Extract critical and high severity issues from all sections
        important_issues = []
        
        for section_name, section_analysis in analysis_result["sections"].items():
            if "error" in section_analysis:
                continue
                
            if "issues" in section_analysis:
                for issue in section_analysis.get("issues", []):
                    if issue.get("severity") in ["critical", "high"]:
                        important_issues.append({
                            "section": section_name,
                            "severity": issue.get("severity"),
                            "title": issue.get("title"),
                            "recommendation": issue.get("recommendation")
                        })
        
        # Generate the prompt
        issues_json = json.dumps(important_issues, indent=2)
        metadata = analysis_result["metadata"]["snapshot_metadata"]
        
        prompt = f"""
You are analyzing a Windows system state snapshot from computer {metadata.get('ComputerName')} running {metadata.get('OSVersion')}.

Based on the important issues found in the analysis, create an overall system summary.

Important issues detected:
```json
{issues_json}
```

Provide your summary as JSON with the following structure:
{{
  "overall_health": "good|fair|poor",
  "critical_issues_count": number,
  "high_priority_issues_count": number,
  "top_recommendations": [
    {{
      "priority": 1,
      "description": "Clear description of the recommendation",
      "rationale": "Why this is important"
    }},
    ...
  ],
  "system_assessment": "Brief overall assessment of system health, performance, and security",
  "next_steps": "Suggested next actions for the system administrator"
}}

Important: Respond ONLY with valid JSON, no other text before or after.
"""
        return prompt