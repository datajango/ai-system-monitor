"""
Base class for section-specific analyzers
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Set
import json
import logging

logger = logging.getLogger(__name__)

class BaseSectionAnalyzer(ABC):
    """
    Base class for section-specific analyzers that defines the interface
    for creating prompts, specifying required input files, and output formats.
    """
    
    # Maximum length of JSON data in prompts to prevent API errors
    MAX_JSON_LENGTH = 8000
    
    # Flag to indicate if this analyzer should use chunking for large data
    USES_CHUNKING = False
    
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
    
    def analyze_with_chunking(self, lm_client, section_data: Any, additional_data: Optional[Dict[str, Any]] = None, llm_log_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze large datasets by breaking them into chunks, to be implemented by subclasses.
        
        Args:
            lm_client: LLM client for making API calls
            section_data: The section data to analyze
            additional_data: Optional additional data from other sections
            llm_log_dir: Directory to save LLM interaction logs, or None to skip
            
        Returns:
            Analysis results
        """
        # Default implementation just calls the standard analysis
        # This should be overridden by analyzers that need chunking
        logger.warning(f"analyze_with_chunking called on {self.section_name} analyzer but not implemented, falling back to standard analysis")
        return self.analyze_standard(lm_client, section_data, additional_data, llm_log_dir)
    
    def analyze_standard(self, lm_client, section_data: Any, additional_data: Optional[Dict[str, Any]] = None, llm_log_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Standard analysis method for a section using a single LLM call.
        
        Args:
            lm_client: LLM client for making API calls
            section_data: The section data to analyze
            additional_data: Optional additional data from other sections
            llm_log_dir: Directory to save LLM interaction logs, or None to skip
            
        Returns:
            Analysis results
        """
        # Create the prompt
        prompt = self.build_prompt_wrapper(section_data, additional_data)
        
        # Initialize LLM log if needed
        llm_log = None
        if llm_log_dir:
            llm_log = {
                "timestamp": __import__('datetime').datetime.now().isoformat(),
                "section": self.section_name,
                "prompt": prompt
            }
        
        # Call the LLM
        try:
            response = lm_client.generate(prompt)
            
            # Update log if needed
            if llm_log:
                llm_log["response"] = response
                llm_log["status"] = "success"
                
            # Extract JSON from response
            from utils.json_helper import extract_json_from_response
            analysis = extract_json_from_response(response)
            
            # Post-process the results
            return self.post_process_results(analysis)
        except Exception as e:
            # Log the error
            logger.error(f"Error analyzing {self.section_name}: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            
            # Update log if needed
            if llm_log:
                llm_log["error"] = str(e)
                llm_log["traceback"] = traceback.format_exc()
                llm_log["status"] = "error"
            
            # Return error structure
            return {
                "error": f"Analysis failed: {str(e)}",
                "traceback": traceback.format_exc()
            }
        finally:
            # Save the log if needed
            if llm_log and llm_log_dir:
                import json
                from pathlib import Path
                log_file = Path(llm_log_dir) / f"{self.section_name}_llm_interaction.json"
                with open(log_file, "w", encoding="utf-8") as f:
                    json.dump(llm_log, f, indent=2, ensure_ascii=False)
                logger.debug(f"Saved LLM interaction log to {log_file}")
    
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
        
    def analyze(self, lm_client, section_data: Any, additional_data: Optional[Dict[str, Any]] = None, llm_log_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Main analysis entry point - chooses between chunked and standard analysis.
        
        Args:
            lm_client: LLM client for making API calls
            section_data: The section data to analyze
            additional_data: Optional additional data from other sections
            llm_log_dir: Directory to save LLM interaction logs, or None to skip
            
        Returns:
            Analysis results
        """
        if self.USES_CHUNKING:
            logger.info(f"Using chunked analysis for {self.section_name}")
            return self.analyze_with_chunking(lm_client, section_data, additional_data, llm_log_dir)
        else:
            logger.info(f"Using standard analysis for {self.section_name}")
            return self.analyze_standard(lm_client, section_data, additional_data, llm_log_dir)