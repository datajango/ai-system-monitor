"""
Network configuration analyzer - Main module
"""

from typing import Dict, List, Any, Optional, Set
import logging
from datetime import datetime
from pathlib import Path

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry
from utils.json_helper import extract_json_from_response

# Import the specialized components
from prompts.analyzers.network.network_constants import MEDIA_TYPES, ADAPTER_STATUS, PUBLIC_DNS_SERVERS, SENSITIVE_PORTS
from prompts.analyzers.network.network_utils import is_private_ip, extract_key_metrics
from prompts.analyzers.network.network_prompt_factory import create_prompt, create_component_prompt, create_overall_summary_prompt

logger = logging.getLogger(__name__)


@SectionAnalyzerRegistry.register
class NetworkAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for network configuration and connection data.
    """
    
    # Enable chunking for this analyzer
    USES_CHUNKING = True
    
    # Override the max JSON length for this analyzer specifically
    MAX_JSON_LENGTH = 3000
    
    @property
    def section_name(self) -> str:
        return "Network"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Optionally use other related data for context
        return {"RunningServices.json", "ActiveConnections.json", "FirewallRules.json"}
    
    def is_private_ip(self, ip_address: str) -> Optional[Dict[str, str]]:
        """
        Check if an IP address is within a private range.
        
        Args:
            ip_address: IP address to check
            
        Returns:
            Dict with pattern and description if private, None if public
        """
        return is_private_ip(ip_address)
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from network data.
        
        Args:
            section_data: The network section data
            
        Returns:
            Dictionary of key metrics
        """
        return extract_key_metrics(section_data, self.is_private_ip)
    
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for network data analysis.
        
        Args:
            section_data: The network data
            additional_data: Optional additional data from other sections
            
        Returns:
            Formatted prompt for network data analysis
        """
        return create_prompt(section_data, additional_data, self.extract_key_metrics)
        
    def analyze_with_chunking(self, lm_client, section_data: Any, additional_data: Optional[Dict[str, Any]] = None, llm_log_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze network configuration by breaking it into separate components.
        
        Args:
            lm_client: LLM client for making API calls
            section_data: The full network data
            additional_data: Optional additional data from other sections
            llm_log_dir: Directory to save LLM interaction logs, or None to skip
            
        Returns:
            Aggregated analysis results
        """
        if not isinstance(section_data, dict):
            return {"error": "Invalid network data format"}
        
        # Initialize aggregated results
        all_issues = []
        all_optimizations = []
        component_summaries = []
        
        # Define network components to analyze separately
        components = {
            "adapters": section_data.get("Adapters", []),
            "ip_config": section_data.get("IPConfiguration", []),
            "dns": section_data.get("DNSSettings", []),
            "connections": section_data.get("ActiveConnections", [])
        }
        
        # Process each component
        for component_name, component_data in components.items():
            logger.info(f"Analyzing network component: {component_name}")
            
            # Skip empty components
            if not component_data:
                logger.warning(f"Network component '{component_name}' is empty, skipping")
                continue
            
            # Create prompt for this component
            prompt = create_component_prompt(component_name, component_data)
            
            # Initialize LLM log if needed
            llm_log = None
            if llm_log_dir:
                llm_log = {
                    "timestamp": datetime.now().isoformat(),
                    "section": f"Network_{component_name}",
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
                component_analysis = extract_json_from_response(response)
                
                # Collect issues and optimizations
                if "issues" in component_analysis:
                    # Tag issues with the component they came from
                    for issue in component_analysis["issues"]:
                        issue["component"] = component_name
                    all_issues.extend(component_analysis["issues"])
                
                if "optimizations" in component_analysis:
                    # Tag optimizations with the component they came from
                    for opt in component_analysis["optimizations"]:
                        opt["component"] = component_name
                    all_optimizations.extend(component_analysis["optimizations"])
                
                if "summary" in component_analysis:
                    component_summaries.append(f"{component_name.upper()}: {component_analysis['summary']}")
                
            except Exception as e:
                # Log the error
                logger.error(f"Error analyzing network component {component_name}: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                
                # Update log if needed
                if llm_log:
                    llm_log["error"] = str(e)
                    llm_log["traceback"] = traceback.format_exc()
                    llm_log["status"] = "error"
                
                component_summaries.append(f"Error analyzing {component_name}: {str(e)}")
            finally:
                # Save the log if needed
                if llm_log and llm_log_dir:
                    log_file = Path(llm_log_dir) / f"Network_{component_name}_llm_interaction.json"
                    with open(log_file, "w", encoding="utf-8") as f:
                        import json
                        json.dump(llm_log, f, indent=2, ensure_ascii=False)
                    logger.debug(f"Saved LLM interaction log to {log_file}")
        
        # Create aggregated analysis
        aggregated_analysis = {
            "issues": all_issues,
            "optimizations": all_optimizations,
        }
        
        # Generate an overall summary from component summaries
        if component_summaries:
            metrics = self.extract_key_metrics(section_data)
            overall_summary_prompt = create_overall_summary_prompt(component_summaries, metrics)
            
            # Initialize LLM log if needed
            summary_llm_log = None
            if llm_log_dir:
                summary_llm_log = {
                    "timestamp": datetime.now().isoformat(),
                    "section": "Network_summary",
                    "prompt": overall_summary_prompt
                }
            
            try:
                response = lm_client.generate(overall_summary_prompt)
                
                # Update log if needed
                if summary_llm_log:
                    summary_llm_log["response"] = response
                    summary_llm_log["status"] = "success"
                    
                summary_analysis = extract_json_from_response(response)
                
                if "summary" in summary_analysis:
                    aggregated_analysis["summary"] = summary_analysis["summary"]
                else:
                    # Fallback: Join component summaries
                    aggregated_analysis["summary"] = "\n".join(component_summaries)
            except Exception as e:
                logger.error(f"Error generating overall summary for network analysis: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                
                # Update log if needed
                if summary_llm_log:
                    summary_llm_log["error"] = str(e)
                    summary_llm_log["traceback"] = traceback.format_exc()
                    summary_llm_log["status"] = "error"
                    
                # Fallback: Join component summaries
                aggregated_analysis["summary"] = "\n".join(component_summaries)
            finally:
                # Save the log if needed
                if summary_llm_log and llm_log_dir:
                    log_file = Path(llm_log_dir) / "Network_summary_llm_interaction.json"
                    with open(log_file, "w", encoding="utf-8") as f:
                        import json
                        json.dump(summary_llm_log, f, indent=2, ensure_ascii=False)
                    logger.debug(f"Saved LLM interaction log to {log_file}")
        else:
            aggregated_analysis["summary"] = "No analysis could be generated for any network components."
        
        return aggregated_analysis