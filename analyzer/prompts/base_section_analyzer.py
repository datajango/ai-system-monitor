"""
Base class for section-specific analyzers
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Set


class BaseSectionAnalyzer(ABC):
    """
    Base class for section-specific analyzers that defines the interface
    for creating prompts, specifying required input files, and output formats.
    """
    
    @property
    @abstractmethod
    def section_name(self) -> str:
        """
        The name of the section this analyzer handles.
        """
        pass
    
    @property
    def required_input_files(self) -> Set[str]:
        """
        Set of required input files for this section.
        By default, just the section's own JSON file.
        
        Subclasses should override this if they need additional files.
        """
        return {f"{self.section_name}.json"}
    
    @property
    def optional_input_files(self) -> Set[str]:
        """
        Set of optional input files that enhance the analysis if available.
        
        Subclasses should override this if they can use additional files.
        """
        return set()
    
    @property
    def output_file_name(self) -> str:
        """
        Name of the output file for this section's analysis.
        By default, it's the section name with 'Analysis' suffix.
        
        Subclasses can override this to change the output file naming.
        """
        return f"{self.section_name}Analysis.json"
    
    @abstractmethod
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a section-specific prompt for analysis.
        
        Args:
            section_data: The primary data for this section
            additional_data: Optional additional data from other sections
            
        Returns:
            A formatted prompt string
        """
        pass
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from the section data for quick summary.
        
        Args:
            section_data: The section data
            
        Returns:
            Dictionary of key metrics
        """
        # Default implementation returns empty dict
        # Subclasses should override this to extract meaningful metrics
        return {}
    
    def post_process_results(self, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post-process the analysis results before final output.
        
        This can be used to add additional insights, reformat results,
        or augment the analysis with additional data.
        
        Args:
            analysis_result: The raw analysis from the LLM
            
        Returns:
            Processed analysis result
        """
        # Default implementation returns the result as-is
        # Subclasses can override to add their own post-processing
        return analysis_result
    
    def format_json_template(self) -> Dict[str, Any]:
        """
        Provide a template for the expected JSON output structure.
        
        This can be included in prompts to guide the LLM's output format.
        
        Returns:
            JSON template structure
        """
        return {
            "issues": [
                {
                    "severity": "critical|high|medium|low",
                    "title": "Brief description of the issue",
                    "description": "Detailed explanation",
                    "recommendation": "Specific action to resolve or improve"
                }
            ],
            "optimizations": [
                {
                    "impact": "high|medium|low",
                    "title": "Brief description of the optimization",
                    "description": "Detailed explanation",
                    "recommendation": "Specific action to implement"
                }
            ],
            "summary": "Brief overall assessment of this section"
        }
    
    def build_prompt_wrapper(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Build a complete prompt with standard wrapper text.
        
        Args:
            section_data: The primary data for this section
            additional_data: Optional additional data from other sections
            
        Returns:
            Complete wrapped prompt
        """
        # Get the core prompt from the subclass
        core_prompt = self.create_prompt(section_data, additional_data)
        
        # Format template as JSON string
        template_json = self.format_json_template()
        import json
        template_str = json.dumps(template_json, indent=2)
        
        # Create the full wrapped prompt
        full_prompt = f"""
You are analyzing the '{self.section_name}' section of a Windows system state snapshot.

{core_prompt}

Provide your analysis as JSON with the following structure:
{template_str}

Important: Respond ONLY with valid JSON, no other text before or after.
"""
        return full_prompt