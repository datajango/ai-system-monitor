#!/usr/bin/env python3
"""
LM Studio Analyzer for System State Monitor

This script analyzes system state snapshots from the System State Monitor by
sending the data to LM Studio for analysis and recommendations.
Output is structured JSON for programmatic processing.
"""

import argparse
import json
import os
import sys
from pathlib import Path
import requests
import logging
from typing import Dict, List, Any, Optional, Tuple
import datetime
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

class LMStudioAnalyzer:
    """
    Analyzes system state snapshots using LM Studio for insights and recommendations.
    """
    
    # Section-specific analysis prompts
    SECTION_PROMPTS = {
        "Path": """
Analyze the PATH environment variable data:
1. Check for invalid paths that don't exist
2. Identify potential security risks (writable directories by non-admin users)
3. Look for duplicate entries
4. Identify unusual or suspicious path entries
5. Check for proper order of important entries (like Windows system directories)
""",
        "InstalledPrograms": """
Analyze the installed programs data:
1. Identify outdated software that could pose security risks
2. Look for potentially unwanted programs or bloatware
3. Check for software conflicts or redundant applications
4. Identify suspicious or unusual software installations
5. Note any missing essential security or utility software
""",
        "StartupPrograms": """
Analyze the startup programs data:
1. Identify applications that could slow system boot time
2. Look for suspicious or unrecognized startup entries
3. Check for unnecessary applications in startup
4. Identify potential autorun malware
5. Suggest optimization of startup programs
""",
        "RunningServices": """
Analyze the running services data:
1. Identify unnecessary services that could be disabled
2. Look for suspicious or unusual services
3. Check for services that should be running but aren't
4. Identify services with high resource usage
5. Suggest service configuration optimizations
""",
        "DiskSpace": """
Analyze the disk space data:
1. Identify drives with low free space
2. Calculate critical thresholds based on drive size
3. Suggest cleanup opportunities
4. Check for unusual partition layouts or sizes
5. Evaluate disk space allocation efficiency
""",
        "PerformanceData": """
Analyze the performance data:
1. Evaluate CPU usage patterns and identify bottlenecks
2. Analyze memory usage and identify potential memory leaks
3. Check for resource-intensive processes
4. Suggest hardware upgrade considerations if appropriate
5. Provide performance optimization recommendations
""",
        "Network": """
Analyze the network configuration data:
1. Check for security issues in network adapter settings
2. Identify unusual or suspicious network connections
3. Evaluate DNS configuration for security and performance
4. Check for network adapter performance issues
5. Suggest network configuration optimizations
""",
        "Environment": """
Analyze the environment variables data:
1. Look for security issues in environment variable settings
2. Check for variable conflicts or redundancies
3. Identify unusual or potentially harmful variables
4. Suggest best practices for environment variable configuration
5. Check for missing important variables
""",
        "WindowsFeatures": """
Analyze the Windows features data:
1. Identify unnecessary features that could be disabled
2. Look for security-critical features that should be enabled
3. Check for unused features consuming resources
4. Suggest feature configurations for optimal security and performance
5. Check for problematic feature combinations
""",
        "RegistrySettings": """
Analyze the registry settings data:
1. Look for security vulnerabilities in registry configuration
2. Identify performance-impacting registry settings
3. Check for unusual or potentially harmful registry entries
4. Suggest registry optimizations for better system performance
5. Identify registry configuration inconsistencies
""",
        "WindowsUpdates": """
Analyze the Windows updates data:
1. Check for missing critical security updates
2. Identify update installation failures
3. Check update configuration for optimal security
4. Evaluate update history patterns
5. Suggest update management improvements
""",
        "Drivers": """
Analyze the device drivers data:
1. Identify outdated drivers that need updating
2. Look for problematic or unstable drivers
3. Check for unsigned drivers that pose security risks
4. Suggest driver update priorities
5. Identify driver conflicts or issues
""",
        "PythonInstallations": """
Analyze the Python installations data:
1. Check for multiple Python installations and potential conflicts
2. Identify outdated Python versions with security risks
3. Suggest virtual environment usage best practices
4. Check for proper configuration of Python paths
5. Identify package management issues or opportunities
""",
        "Browsers": """
Analyze the browser data:
1. Check for outdated browsers with security vulnerabilities
2. Identify potentially harmful or suspicious extensions
3. Suggest browser security configuration improvements
4. Check for excessive or redundant extensions
5. Recommend browser optimization for performance and security
"""
    }
    
    # Default prompt for sections without specific prompts
    DEFAULT_SECTION_PROMPT = """
Analyze this section data:
1. Identify potential issues or security risks
2. Find optimization opportunities 
3. Look for unusual or suspicious configurations
4. Suggest concrete improvements
5. Prioritize recommendations by importance
"""
    
    def __init__(
        self,
        server_url: str = "http://localhost:1234/v1",
        max_tokens: int = 4096,
        temperature: float = 0.7,
        config_path: Optional[str] = None
    ):
        """
        Initialize the LM Studio Analyzer.
        
        Args:
            server_url: URL of the LM Studio server
            max_tokens: Maximum number of tokens for the response
            temperature: Temperature for generation (0.0-1.0)
            config_path: Path to configuration file
        """
        self.server_url = server_url
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.config_path = config_path
        
        # Load config if provided
        if config_path:
            self.load_config()
            
    def load_config(self) -> None:
        """
        Load configuration from file.
        """
        if not self.config_path:
            return
            
        config_file = Path(self.config_path)
        if config_file.exists():
            try:
                with open(config_file, "r") as f:
                    config = json.load(f)
                    
                self.server_url = config.get("server_url", self.server_url)
                self.max_tokens = config.get("max_tokens", self.max_tokens)
                self.temperature = config.get("temperature", self.temperature)
                
                logger.info(f"Loaded configuration from {config_file}")
            except Exception as e:
                logger.warning(f"Error loading configuration: {e}")
        else:
            logger.warning(f"Configuration file not found: {config_file}")
            
    def save_config(self) -> None:
        """
        Save configuration to file.
        """
        if not self.config_path:
            return
            
        config_file = Path(self.config_path)
        config_dir = config_file.parent
        
        if not config_dir.exists():
            config_dir.mkdir(parents=True)
            
        config = {
            "server_url": self.server_url,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "last_updated": datetime.datetime.now().isoformat()
        }
        
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)
            
        logger.info(f"Saved configuration to {config_file}")
        
    def load_snapshot_data(
        self, 
        snapshot_path: str, 
        analysis_focus: List[str] = None
    ) -> Dict[str, Any]:
        """
        Load data from a system state snapshot.
        
        Args:
            snapshot_path: Path to the snapshot directory
            analysis_focus: List of sections to focus on, or None for all sections
        
        Returns:
            Dictionary with metadata and section data
        """
        snapshot_dir = Path(snapshot_path)
        
        if not snapshot_dir.exists() or not snapshot_dir.is_dir():
            raise ValueError(f"Snapshot directory not found: {snapshot_dir}")
            
        # Load metadata
        metadata_file = snapshot_dir / "metadata.json"
        if not metadata_file.exists():
            raise ValueError(f"Metadata file not found: {metadata_file}")
            
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
            
        # Load index or get file list
        index_file = snapshot_dir / "index.json"
        if index_file.exists():
            with open(index_file, "r") as f:
                index = json.load(f)
        else:
            # Create index from files
            index = {}
            for file in snapshot_dir.glob("*.json"):
                if file.name not in ["metadata.json", "index.json"]:
                    index[file.stem] = file.name
        
        system_data = {
            "metadata": metadata,
            "sections": {}
        }
        
        # Determine which sections to include
        sections_to_include = []
        
        if not analysis_focus or "All" in analysis_focus:
            sections_to_include = list(index.keys())
        else:
            for section in analysis_focus:
                if section in index:
                    sections_to_include.append(section)
                else:
                    logger.warning(f"Section '{section}' not found in snapshot data")
        
        # Load each section
        for section in sections_to_include:
            section_file = snapshot_dir / index[section]
            
            if section_file.exists():
                with open(section_file, "r") as f:
                    section_data = json.load(f)
                    system_data["sections"][section] = section_data.get("Data")
            else:
                logger.warning(f"Section file not found: {section_file}")
                
        return system_data
    
    def analyze_section(self, section_name: str, section_data: Any) -> str:
        """
        Generate a section-specific prompt for analysis.
        
        Args:
            section_name: Name of the section
            section_data: Data for the section
            
        Returns:
            Analysis prompt specific to this section
        """
        # Get section-specific prompt or use default
        section_prompt = self.SECTION_PROMPTS.get(section_name, self.DEFAULT_SECTION_PROMPT)
        
        # Format the data as JSON
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
            
        # Build the complete section analysis prompt
        prompt = f"""
You are analyzing the '{section_name}' section of a Windows system state snapshot.

{section_prompt}

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
        
    def call_lm_studio(self, prompt: str) -> str:
        """
        Call the LM Studio API.
        
        Args:
            prompt: The prompt to send to the model
            
        Returns:
            Model's response text
        """
        completions_url = f"{self.server_url}/chat/completions"
        
        payload = {
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that provides detailed analysis of Windows system state data."},
                {"role": "user", "content": prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": False
        }
        
        try:
            response = requests.post(completions_url, json=payload)
            response.raise_for_status()
            
            response_data = response.json()
            return response_data["choices"][0]["message"]["content"]
            
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                status_code = e.response.status_code
                try:
                    error_data = e.response.json()
                    error_message = error_data.get('error', {}).get('message', str(e))
                except:
                    error_message = str(e)
                    
                logger.error(f"API error ({status_code}): {error_message}")
            else:
                logger.error(f"Connection error: {str(e)}")
                
            if "Connection refused" in str(e):
                logger.error("LM Studio server not running or not accessible at the configured URL.")
                logger.error("Make sure LM Studio is running and the server is started.")
                
            raise RuntimeError(f"Failed to get response from LM Studio: {str(e)}")
    
    def extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """
        Extract JSON from the model's response, handling cases where the model
        might add extra text before or after the JSON.
        
        Args:
            response: The raw response from the model
            
        Returns:
            Parsed JSON object
        """
        # Try to parse the entire response as JSON first
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass
            
        # Find JSON-like content using regex
        json_match = re.search(r'({[\s\S]*})', response)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
                
        # More aggressive approach - try to find anything between curly braces
        try:
            start = response.find('{')
            end = response.rfind('}')
            if start != -1 and end != -1 and end > start:
                json_str = response[start:end+1]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass
            
        # If all else fails, return an error structure
        logger.error("Could not extract valid JSON from model response")
        logger.debug(f"Failed response: {response}")
        return {
            "error": True,
            "message": "Failed to parse model response as JSON",
            "raw_response": response
        }
            
    def analyze_snapshot(
        self, 
        snapshot_path: str, 
        analysis_focus: List[str] = None,
        output_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a system state snapshot.
        
        Args:
            snapshot_path: Path to the snapshot directory
            analysis_focus: List of sections to focus on, or None for all sections
            output_file: Path to save the analysis, or None to print to console
            
        Returns:
            Analysis results as dictionary
        """
        # Load data
        logger.info(f"Loading snapshot data from {snapshot_path}")
        system_data = self.load_snapshot_data(snapshot_path, analysis_focus)
        
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
            prompt = self.analyze_section(section_name, section_data)
            
            # Call LM Studio for this section
            response = self.call_lm_studio(prompt)
            
            # Parse JSON response
            section_analysis = self.extract_json_from_response(response)
            
            # Add to complete analysis
            analysis_result["sections"][section_name] = section_analysis
        
        # Generate overall summary
        logger.info("Generating overall system summary")
        summary_prompt = self.generate_summary_prompt(analysis_result)
        summary_response = self.call_lm_studio(summary_prompt)
        summary_data = self.extract_json_from_response(summary_response)
        
        analysis_result["summary"] = summary_data
        
        # Output analysis
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
    
    def generate_summary_prompt(self, analysis_result: Dict[str, Any]) -> str:
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

def main():
    """
    Main entry point.
    """
    # Determine default config path
    default_config_path = os.path.join(
        os.path.expanduser("~"), 
        ".config", 
        "system-monitor", 
        "lm-studio-config.json"
    )
    
    # Parse arguments
    parser = argparse.ArgumentParser(
        description="Analyze system state snapshots using LM Studio for insights and recommendations"
    )
    parser.add_argument(
        "snapshot_path", 
        help="Path to the system state snapshot directory"
    )
    parser.add_argument(
        "--server-url", "-u",
        default="http://localhost:1234/v1",
        help="URL of the LM Studio server"
    )
    parser.add_argument(
        "--max-tokens", "-t",
        type=int,
        default=4096,
        help="Maximum number of tokens for the response"
    )
    parser.add_argument(
        "--temperature", "-temp",
        type=float,
        default=0.7,
        help="Temperature for generation (0.0-1.0)"
    )
    parser.add_argument(
        "--config", "-c",
        default=default_config_path,
        help="Path to configuration file"
    )
    parser.add_argument(
        "--use-config", "-uc",
        action="store_true",
        help="Use configuration file"
    )
    parser.add_argument(
        "--save-config", "-sc",
        action="store_true",
        help="Save configuration to file"
    )
    parser.add_argument(
        "--output", "-o",
        help="Path to save analysis output (JSON format)"
    )
    parser.add_argument(
        "--focus", "-f",
        nargs="+",
        help="Sections to focus analysis on (space-separated)"
    )
    parser.add_argument(
        "--debug", "-d",
        action="store_true",
        help="Enable debug logging"
    )
    
    args = parser.parse_args()
    
    # Set log level
    if args.debug:
        logger.setLevel(logging.DEBUG)
        
    try:
        # Initialize analyzer
        analyzer = LMStudioAnalyzer(
            server_url=args.server_url,
            max_tokens=args.max_tokens,
            temperature=args.temperature,
            config_path=args.config if args.use_config or args.save_config else None
        )
        
        # Save config if requested
        if args.save_config:
            analyzer.save_config()
            
        # Analyze snapshot
        analyzer.analyze_snapshot(
            snapshot_path=args.snapshot_path,
            analysis_focus=args.focus,
            output_file=args.output
        )
        
    except Exception as e:
        logger.error(f"Error: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()