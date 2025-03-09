# File path: /path/to/your/analyzer/analyzer.py
"""
Modified core analyzer functionality for processing system state data with model selection support
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import datetime
import traceback
import os

from config import AnalyzerConfig
from models.lm_studio_client import LMStudioClient
from data_loader import SystemStateDataLoader
from prompt_engine import PromptEngine
from utils.json_helper import extract_json_from_response, save_json_file
# Add this missing import:
from prompts.section_analyzers_registry import SectionAnalyzerRegistry

logger = logging.getLogger(__name__)

class SystemStateAnalyzer:
    """
    Analyzes system state snapshots using LM Studio for insights and recommendations.
    """
    
    def __init__(self, config: AnalyzerConfig):
        """
        Initialize the system state analyzer.
        
        Args:
            config: Analyzer configuration
        """
        self.config = config
        self.data_loader = SystemStateDataLoader()
        self.prompt_engine = PromptEngine()
        self.lm_client = LMStudioClient(
            server_url=config.server_url,
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature
        )
    
    def analyze_snapshot(self, 
    snapshot_path: str, 
    analysis_focus: Optional[List[str]] = None,
    output_file: Optional[str] = None,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
        """
        Analyze a system state snapshot.
        
        Args:
            snapshot_path: Path to the snapshot directory
            analysis_focus: List of sections to focus on, or None for all sections
            output_file: Path to save the combined analysis, or None to print to console
            output_dir: Directory to save individual section analyses, or None to skip
            
        Returns:
            Analysis results as dictionary
        """
        # Load data
        logger.info(f"Loading snapshot data from {snapshot_path}")
        try:
            system_data = self.data_loader.load_snapshot_data(snapshot_path, analysis_focus)
        except Exception as e:
            # Re-raise with more context
            raise RuntimeError(f"Failed to load snapshot data: {str(e)}") from e
        
        metadata = system_data["metadata"]
        
        # Create a complete analysis result
        analysis_result = {
            "metadata": {
                "analyzed_at": datetime.datetime.now().isoformat(),
                "snapshot_metadata": metadata,
                "analyzer_version": "1.0.0",
                "model": self.config.model,
                "server_url": self.config.server_url
            },
            "sections": {}
        }
        
        # Create LLM logging directory if output_dir is specified
        llm_log_dir = None
        if output_dir:
            llm_log_dir = Path(output_dir) / "llm"
            llm_log_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"LLM interaction logs will be saved to {llm_log_dir}")
        
        # Analyze each section individually
        for section_name, section_data in system_data["sections"].items():
            logger.info(f"Analyzing section: {section_name}")
            
            # Check if the section had a loading error
            if isinstance(section_data, dict) and "error" in section_data:
                logger.error(f"Skipping section {section_name} due to loading error: {section_data['error']}")
                analysis_result["sections"][section_name] = {"error": section_data["error"]}
                continue
            
            try:
                # Get the appropriate analyzer for this section
                analyzer = SectionAnalyzerRegistry.get_analyzer(section_name)
                
                if analyzer is None:
                    # Use a generic approach if no specific analyzer is registered
                    #logger.warning(f"No analyzer registered for section: {section_name}")
                    prompt = self.prompt_engine.create_section_prompt(
                        section_name, 
                        section_data,
                        all_sections_data=system_data["sections"]
                    )
                    
                    # Initialize LLM logging object with the prompt
                    llm_log = {
                        "timestamp": datetime.datetime.now().isoformat(),
                        "section": section_name,
                        "model": self.config.model,
                        "prompt": prompt,
                    }
                    
                    # Try to call LM Studio for this section
                    response = None
                    try:
                        response = self.lm_client.generate(prompt)
                        llm_log["response"] = response
                        llm_log["status"] = "success"
                    except Exception as e:
                        # Log the error in the LLM log
                        error_msg = str(e)
                        error_traceback = traceback.format_exc()
                        llm_log["error"] = error_msg
                        llm_log["traceback"] = error_traceback
                        llm_log["status"] = "error"
                        
                        # Re-raise to be caught by the outer try block
                        raise
                    finally:
                        # Log the LLM interaction if llm_log_dir is specified, whether successful or not
                        if llm_log_dir:
                            log_file = llm_log_dir / f"{section_name}_llm_interaction.json"
                            with open(log_file, "w", encoding="utf-8") as f:
                                json.dump(llm_log, f, indent=2, ensure_ascii=False)
                            if "error" in llm_log:
                                logger.debug(f"Logged failed LLM interaction for {section_name} to {log_file}")
                            else:
                                logger.debug(f"Logged successful LLM interaction for {section_name} to {log_file}")
                    
                    # Parse JSON response (only if we got a successful response)
                    section_analysis = extract_json_from_response(response)
                else:
                    # Use the specialized analyzer
                    additional_data = {}
                    # Collect any additional data the analyzer might need
                    for file_name in analyzer.optional_input_files:
                        # Convert file name to section name (remove .json)
                        opt_section = file_name.replace('.json', '')
                        if opt_section in system_data["sections"]:
                            additional_data[opt_section] = system_data["sections"][opt_section]
                    
                    # Use the analyzer's analyze method
                    logger.info(f"Using specialized analyzer for section: {section_name}")
                    if hasattr(analyzer, 'USES_CHUNKING') and analyzer.USES_CHUNKING:
                        logger.info(f"Using chunked analysis for section: {section_name}")
                        section_analysis = analyzer.analyze_with_chunking(
                            self.lm_client, 
                            section_data, 
                            additional_data, 
                            llm_log_dir
                        )
                    else:
                        section_analysis = analyzer.analyze_standard(
                            self.lm_client, 
                            section_data, 
                            additional_data, 
                            llm_log_dir
                        )
                
                # Add to complete analysis
                analysis_result["sections"][section_name] = section_analysis
                
                # Save individual section analysis if output_dir is specified
                if output_dir:
                    self._save_section_analysis(output_dir, section_name, section_analysis)
            except Exception as e:
                logger.error(f"Error analyzing section {section_name}: {str(e)}")
                logger.debug(traceback.format_exc())
                analysis_result["sections"][section_name] = {
                    "error": f"Analysis failed: {str(e)}",
                    "traceback": traceback.format_exc()
                }
        
        # Generate overall summary
        logger.info("Generating overall system summary")
        try:
            summary_prompt = self.prompt_engine.create_summary_prompt(analysis_result)
            
            # Initialize summary LLM log
            summary_llm_log = {
                "timestamp": datetime.datetime.now().isoformat(),
                "section": "summary",
                "model": self.config.model,
                "prompt": summary_prompt,
            }
            
            # Try to generate summary
            summary_response = None
            try:
                summary_response = self.lm_client.generate(summary_prompt)
                summary_llm_log["response"] = summary_response
                summary_llm_log["status"] = "success"
            except Exception as e:
                # Log the error in the LLM log
                error_msg = str(e)
                error_traceback = traceback.format_exc()
                summary_llm_log["error"] = error_msg
                summary_llm_log["traceback"] = error_traceback
                summary_llm_log["status"] = "error"
                
                # Re-raise to be caught by the outer try block
                raise
            finally:
                # Log the summary LLM interaction if llm_log_dir is specified, whether successful or not
                if llm_log_dir:
                    log_file = llm_log_dir / "summary_llm_interaction.json"
                    with open(log_file, "w", encoding="utf-8") as f:
                        json.dump(summary_llm_log, f, indent=2, ensure_ascii=False)
                    if "error" in summary_llm_log:
                        logger.debug(f"Logged failed summary LLM interaction to {log_file}")
                    else:
                        logger.debug(f"Logged successful summary LLM interaction to {log_file}")
            
            summary_data = extract_json_from_response(summary_response)
            
            analysis_result["summary"] = summary_data
            
            # Save summary if output_dir is specified
            if output_dir:
                self._save_section_analysis(output_dir, "summary", summary_data)
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            logger.debug(traceback.format_exc())
            analysis_result["summary"] = {
                "error": f"Summary generation failed: {str(e)}",
                "traceback": traceback.format_exc()
            }
        
        # Output combined analysis
        if output_file:
            try:
                output_path = Path(output_file)
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(analysis_result, f, indent=2)
                logger.info(f"Analysis saved to {output_path}")
            except Exception as e:
                logger.error(f"Error saving analysis to {output_file}: {str(e)}")
                logger.debug(traceback.format_exc())
        else:
            # Pretty print just the summary to console
            logger.info("\n\n==================== SYSTEM ANALYSIS SUMMARY ====================\n")
            logger.info(f"Analysis performed using model: {self.config.model or 'server default'}")
            logger.info(f"Server URL: {self.config.server_url}\n")
            
            if "error" in analysis_result.get("summary", {}):
                print("Error generating summary. See the complete analysis for details.")
                print(f"Error: {analysis_result['summary']['error']}")
            else:
                try:
                    print(json.dumps(analysis_result.get("summary", {"error": "No summary generated"}), indent=2))
                except Exception as e:
                    print(f"Error displaying summary: {str(e)}")
            logger.info("\n==================== END OF SUMMARY ====================\n")
            logger.info("Use --output to save the complete analysis as JSON")
            
        return analysis_result

    def _save_section_analysis(self, output_dir: str, section_name: str, analysis: Dict[str, Any]) -> None:
        """
        Save individual section analysis to a file.
        
        Args:
            output_dir: Directory to save the analysis
            section_name: Name of the section
            analysis: Analysis data to save
        """
        try:
            dir_path = Path(output_dir)
            if not dir_path.exists():
                dir_path.mkdir(parents=True)
                
            file_path = dir_path / f"{section_name}Analysis.json"
            
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(analysis, f, indent=2)
                
            logger.info(f"Saved {section_name} analysis to {file_path}")
        except Exception as e:
            logger.error(f"Error saving section analysis for {section_name}: {str(e)}")
            logger.debug(traceback.format_exc())