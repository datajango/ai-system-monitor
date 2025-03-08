"""
Core analyzer functionality for processing system state data
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import datetime

from config import AnalyzerConfig
from models.lm_studio_client import LMStudioClient
from data_loader import SystemStateDataLoader
from prompt_engine import PromptEngine
from utils.json_helper import extract_json_from_response

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
            max_tokens=config.max_tokens,
            temperature=config.temperature
        )
    
    def analyze_snapshot(
        self, 
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
        system_data = self.data_loader.load_snapshot_data(snapshot_path, analysis_focus)
        
        metadata = system_data["metadata"]
        
        # Create a complete analysis result
        analysis_result = {
            "metadata": {
                "analyzed_at": datetime.datetime.now().isoformat(),
                "snapshot_metadata": metadata,
                "analyzer_version": "1.0.0"
            },
            "sections": {}
        }
        
        # Analyze each section individually
        for section_name, section_data in system_data["sections"].items():
            logger.info(f"Analyzing section: {section_name}")
            
            # Create section-specific prompt
            prompt = self.prompt_engine.create_section_prompt(
                section_name, 
                section_data,
                all_sections_data=system_data["sections"]
            )
            
            # Call LM Studio for this section
            response = self.lm_client.generate(prompt)
            
            # Parse JSON response
            section_analysis = extract_json_from_response(response)
            
            # Add to complete analysis
            analysis_result["sections"][section_name] = section_analysis
            
            # Save individual section analysis if output_dir is specified
            if output_dir:
                self._save_section_analysis(output_dir, section_name, section_analysis)
        
        # Generate overall summary
        logger.info("Generating overall system summary")
        summary_prompt = self.prompt_engine.create_summary_prompt(analysis_result)
        summary_response = self.lm_client.generate(summary_prompt)
        summary_data = extract_json_from_response(summary_response)
        
        analysis_result["summary"] = summary_data
        
        # Save summary if output_dir is specified
        if output_dir:
            self._save_section_analysis(output_dir, "summary", summary_data)
        
        # Output combined analysis
        if output_file:
            output_path = Path(output_file)
            with open(output_path, "w") as f:
                json.dump(analysis_result, f, indent=2)
            logger.info(f"Analysis saved to {output_path}")
        else:
            # Pretty print just the summary to console
            logger.info("\n\n==================== SYSTEM ANALYSIS SUMMARY ====================\n")
            if "error" in summary_data:
                print("Error generating summary. See the complete analysis for details.")
            else:
                print(json.dumps(summary_data, indent=2))
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
        dir_path = Path(output_dir)
        if not dir_path.exists():
            dir_path.mkdir(parents=True)
            
        file_path = dir_path / f"{section_name}Analysis.json"
        
        with open(file_path, "w") as f:
            json.dump(analysis, f, indent=2)
            
        logger.info(f"Saved {section_name} analysis to {file_path}")