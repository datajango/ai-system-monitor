"""
Installed programs analyzer
"""

from typing import Dict, Any, Optional, Set, List
import re
from datetime import datetime
import json
import logging
from pathlib import Path

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry
from utils.json_helper import extract_json_from_response

logger = logging.getLogger(__name__)


@SectionAnalyzerRegistry.register
class InstalledProgramsAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for installed programs data.
    """
    
    # Enable chunking for this analyzer
    USES_CHUNKING = True
    
    # Override the max JSON length for this analyzer specifically
    # Installed programs data can be extremely large, so we need aggressive truncation
    MAX_JSON_LENGTH = 1500
    
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
    
    def _categorize_program(self, program: Dict[str, Any]) -> List[str]:
        """
        Categorize a program based on its name and other properties.
        
        Args:
            program: Program information dictionary
            
        Returns:
            List of categories this program belongs to
        """
        program_name = program.get("Name", "").lower()
        categories = []
        
        for category, keywords in self.SOFTWARE_CATEGORIES.items():
            if any(keyword in program_name for keyword in keywords):
                categories.append(category)
                
        return categories
    
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
        
        # Track recent and potentially problematic installations
        recent_installations = []
        potential_bloatware = []
        security_software = []
        large_programs = []
        
        try:
            today = datetime.now()
            
            for program in section_data:
                program_name = program.get("Name", "").lower()
                
                # Categorize program
                categories = self._categorize_program(program)
                
                # Count by category
                for category in categories:
                    categorized_counts[category] += 1
                
                # Check if recently installed (in the last 30 days)
                install_date = program.get("InstallDate")
                if install_date and isinstance(install_date, str):
                    try:
                        # Try different date formats
                        if re.match(r'^\d{8}$', install_date):  # YYYYMMDD
                            install_datetime = datetime.strptime(install_date, "%Y%m%d")
                        elif re.match(r'^\d{4}-\d{2}-\d{2}$', install_date):  # YYYY-MM-DD
                            install_datetime = datetime.strptime(install_date, "%Y-%m-%d")
                        else:
                            # Skip if format is unknown
                            continue
                            
                        days_since_install = (today - install_datetime).days
                        
                        if days_since_install <= 30:
                            recent_installations.append({
                                "name": program.get("Name"),
                                "date": install_date,
                                "days_ago": days_since_install
                            })
                    except ValueError as e:
                        # Log the error but continue processing
                        logger.debug(f"Date parsing error for program {program.get('Name')}: {e}")
                        continue
                
                # Check for potential bloatware
                if "bloatware" in categories:
                    potential_bloatware.append(program.get("Name"))
                
                # Track security software
                if "security" in categories:
                    security_software.append(program.get("Name"))
                
                # Track large programs (if size information is available)
                if program.get("EstimatedSize"):
                    try:
                        size_mb = float(program.get("EstimatedSize")) / 1024
                        if size_mb > 1000:  # Over 1GB
                            large_programs.append({
                                "name": program.get("Name"),
                                "size_mb": size_mb
                            })
                    except (ValueError, TypeError):
                        pass
                        
        except Exception as e:
            logger.error(f"Error analyzing programs: {str(e)}")
        
        return {
            "total_programs": total_programs,
            "recent_installations_count": len(recent_installations),
            "recent_installations": recent_installations[:5],  # Limit to 5 for conciseness
            "security_software_count": categorized_counts["security"],
            "security_software": security_software[:5],  # Limit to 5
            "development_tools_count": categorized_counts["development"],
            "utility_software_count": categorized_counts["utilities"],
            "potential_bloatware_count": categorized_counts["bloatware"],
            "potential_bloatware": potential_bloatware[:5],  # Limit to 5
            "large_programs": large_programs[:5]  # Limit to 5
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
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > self.MAX_JSON_LENGTH:
            section_json = section_json[:self.MAX_JSON_LENGTH] + "... [truncated for length]"
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Add startup programs context if available
        startup_context = ""
        if additional_data and "StartupPrograms" in additional_data:
            startup_programs = additional_data["StartupPrograms"]
            # Just count startup programs - don't include the full data
            startup_count = len(startup_programs) if isinstance(startup_programs, list) else "unknown"
            startup_context = f"\n- Startup Programs: {startup_count} programs configured to run at startup"
        
        # Format recent installations
        recent_installs_str = ""
        if metrics["recent_installations"]:
            recent_installs_str = "\nRecent installations (last 30 days):"
            for prog in metrics["recent_installations"]:
                recent_installs_str += f"\n  - {prog['name']} ({prog['days_ago']} days ago)"
        
        # Format security software
        security_str = ""
        if metrics["security_software"]:
            security_str = "\nSecurity software detected:"
            for prog in metrics["security_software"]:
                security_str += f"\n  - {prog}"
        
        # Format potential bloatware
        bloatware_str = ""
        if metrics["potential_bloatware"]:
            bloatware_str = "\nPotential bloatware detected:"
            for prog in metrics["potential_bloatware"]:
                bloatware_str += f"\n  - {prog}"
        
        # Format large programs
        large_programs_str = ""
        if metrics.get("large_programs"):
            large_programs_str = "\nLarge programs detected:"
            for prog in metrics["large_programs"]:
                large_programs_str += f"\n  - {prog['name']} ({prog['size_mb']:.1f} MB)"
        
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
- Recent installations (last 30 days): {metrics['recent_installations_count']}
- Security software detected: {metrics['security_software_count']}
- Development tools detected: {metrics['development_tools_count']}
- Utility software detected: {metrics['utility_software_count']}
- Potential bloatware detected: {metrics['potential_bloatware_count']}{startup_context}{recent_installs_str}{security_str}{bloatware_str}{large_programs_str}

NOTE: The installed programs data provided below may be truncated. Focus your analysis on the key metrics above and the sample of programs that can be seen.

The installed programs data for analysis:
```json
{section_json}
```
"""
        return prompt
    
    def analyze_with_chunking(self, lm_client, section_data: Any, additional_data: Optional[Dict[str, Any]] = None, llm_log_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze installed programs by breaking the list into chunks.
        
        Args:
            lm_client: LLM client for making API calls
            section_data: List of installed programs
            additional_data: Optional additional data from other sections
            llm_log_dir: Directory to save LLM interaction logs, or None to skip
            
        Returns:
            Aggregated analysis results
        """
        if not isinstance(section_data, list):
            return {"error": "Invalid installed programs data format"}
        
        # Extract key metrics for overall context
        metrics = self.extract_key_metrics(section_data)
        
        # Group programs by category for better analysis focus
        categorized_programs = {
            "security": [],
            "bloatware": [],
            "development": [],
            "utilities": [],
            "recent": [],
            "other": []
        }
        
        # Categorize all programs
        try:
            today = datetime.now()
            
            for program in section_data:
                # Check if recently installed (in the last 30 days)
                is_recent = False
                install_date = program.get("InstallDate")
                if install_date and re.match(r'^\d{8}$', install_date):
                    try:
                        install_datetime = datetime.strptime(install_date, "%Y%m%d")
                        if (today - install_datetime).days <= 30:
                            categorized_programs["recent"].append(program)
                            is_recent = True
                    except ValueError:
                        pass
                
                if not is_recent:
                    # Categorize by type
                    categories = self._categorize_program(program)
                    
                    if categories:
                        # Add to the first matching category
                        categorized_programs[categories[0]].append(program)
                    else:
                        categorized_programs["other"].append(program)
        except Exception as e:
            logger.error(f"Error categorizing programs: {str(e)}")
            # Fallback to simpler approach if categorization fails
            return self.analyze_standard(lm_client, section_data, additional_data, llm_log_dir)
        
        # Initialize aggregated results
        all_issues = []
        all_optimizations = []
        category_summaries = []
        
        # Analyze each category separately
        for category, programs in categorized_programs.items():
            # Skip empty categories
            if not programs:
                continue
                
            logger.info(f"Analyzing {len(programs)} {category} programs")
            
            # Limit the number of programs to analyze per category
            # to avoid hitting token limits
            sample_size = 15  # Adjust based on typical program entry size
            sample_programs = programs[:sample_size]
            
            # Create prompt for this category
            prompt = self._create_category_prompt(category, sample_programs, len(programs), metrics)
            
            # Initialize LLM log if needed
            llm_log = None
            if llm_log_dir:
                llm_log = {
                    "timestamp": datetime.now().isoformat(),
                    "section": f"InstalledPrograms_{category}",
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
                category_analysis = extract_json_from_response(response)
                
                # Collect issues and optimizations
                if "issues" in category_analysis:
                    # Tag issues with the category they came from
                    for issue in category_analysis["issues"]:
                        issue["category"] = category
                    all_issues.extend(category_analysis["issues"])
                
                if "optimizations" in category_analysis:
                    # Tag optimizations with the category they came from
                    for opt in category_analysis["optimizations"]:
                        opt["category"] = category
                    all_optimizations.extend(category_analysis["optimizations"])
                
                if "summary" in category_analysis:
                    category_summaries.append(f"{category.upper()}: {category_analysis['summary']}")
                
            except Exception as e:
                # Log the error
                logger.error(f"Error analyzing {category} programs: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                
                # Update log if needed
                if llm_log:
                    llm_log["error"] = str(e)
                    llm_log["traceback"] = traceback.format_exc()
                    llm_log["status"] = "error"
                
                category_summaries.append(f"Error analyzing {category} programs: {str(e)}")
            finally:
                # Save the log if needed
                if llm_log and llm_log_dir:
                    from pathlib import Path
                    log_file = Path(llm_log_dir) / f"InstalledPrograms_{category}_llm_interaction.json"
                    with open(log_file, "w", encoding="utf-8") as f:
                        json.dump(llm_log, f, indent=2, ensure_ascii=False)
                    logger.debug(f"Saved LLM interaction log to {log_file}")
        
        # Create aggregated analysis
        aggregated_analysis = {
            "issues": all_issues,
            "optimizations": all_optimizations,
        }
        
        # Generate an overall summary from category summaries
        if category_summaries:
            overall_summary_prompt = self._create_overall_summary_prompt(category_summaries, metrics)
            
            # Initialize LLM log if needed
            summary_llm_log = None
            if llm_log_dir:
                summary_llm_log = {
                    "timestamp": datetime.now().isoformat(),
                    "section": "InstalledPrograms_summary",
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
                    # Fallback: Join category summaries
                    aggregated_analysis["summary"] = "\n".join(category_summaries)
            except Exception as e:
                logger.error(f"Error generating overall summary for installed programs: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                
                # Update log if needed
                if summary_llm_log:
                    summary_llm_log["error"] = str(e)
                    summary_llm_log["traceback"] = traceback.format_exc()
                    summary_llm_log["status"] = "error"
                    
                # Fallback: Join category summaries
                aggregated_analysis["summary"] = "\n".join(category_summaries)
            finally:
                # Save the log if needed
                if summary_llm_log and llm_log_dir:
                    from pathlib import Path
                    log_file = Path(llm_log_dir) / "InstalledPrograms_summary_llm_interaction.json"
                    with open(log_file, "w", encoding="utf-8") as f:
                        json.dump(summary_llm_log, f, indent=2, ensure_ascii=False)
                    logger.debug(f"Saved LLM interaction log to {log_file}")
        else:
            aggregated_analysis["summary"] = "No analysis could be generated for any program categories."
        
        return aggregated_analysis
    
    def _create_category_prompt(self, category: str, programs: List[Any], total_count: int, metrics: Dict[str, Any]) -> str:
        """
        Create a prompt for a specific category of installed programs.
        
        Args:
            category: Category name (security, bloatware, etc.)
            programs: List of programs in this category
            total_count: Total number of programs in this category
            metrics: Overall metrics for context
            
        Returns:
            Formatted prompt
        """
        # Format the data as JSON
        programs_json = json.dumps(programs, ensure_ascii=False)
        
        # Truncate if too large
        if len(programs_json) > self.MAX_JSON_LENGTH:
            programs_json = programs_json[:self.MAX_JSON_LENGTH] + "... [truncated for length]"
        
        # Category-specific instructions
        instructions = {
            "security": """
1. Evaluate if essential security software is installed
2. Check if security software is up-to-date
3. Identify gaps in security coverage
4. Assess potential conflicts between security applications
5. Recommend security improvements if needed
""",
            "bloatware": """
1. Identify potentially unwanted programs and bloatware
2. Evaluate the impact of bloatware on system performance
3. Assess security risks associated with these programs
4. Recommend which programs should be removed
5. Suggest alternative software if replacements are needed
""",
            "development": """
1. Assess if development environments are properly configured
2. Check for outdated development tools that might pose security risks
3. Identify potential conflicts between development environments
4. Evaluate completeness of the development toolchain
5. Suggest optimization opportunities
""",
            "utilities": """
1. Assess if essential system utilities are installed
2. Check for outdated utility software
3. Identify redundant utilities that serve the same purpose
4. Evaluate the usefulness of each utility
5. Recommend optimization opportunities
""",
            "recent": """
1. Evaluate recently installed software for potential risks
2. Identify unusual or suspicious recent installations
3. Assess the impact of recent installations on system performance
4. Check for potential conflicts with existing software
5. Recommend monitoring or removal of suspicious recent installations
""",
            "other": """
1. Categorize these miscellaneous programs into functional groups
2. Identify any outdated or potentially risky software
3. Assess the overall necessity of these programs
4. Look for unusual or suspicious applications
5. Suggest optimization opportunities
"""
        }
        
        prompt = f"""
You are analyzing {category} software installed on a Windows system.

This analysis covers {len(programs)} out of {total_count} total {category} programs installed on the system.

{instructions.get(category, "Analyze these programs thoroughly.")}

System context:
- Total installed programs: {metrics['total_programs']}
- Security software: {metrics['security_software_count']} programs
- Development tools: {metrics['development_tools_count']} programs
- Utility software: {metrics['utility_software_count']} programs
- Potential bloatware: {metrics['potential_bloatware_count']} programs

The {category} programs for analysis:
```json
{programs_json}
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
  "summary": "Brief assessment of the {category} programs"
}}

Important: Respond ONLY with valid JSON, no other text before or after.
"""
        return prompt
    
    def _create_overall_summary_prompt(self, category_summaries: List[str], metrics: Dict[str, Any]) -> str:
        """
        Create a prompt to generate an overall summary from individual category summaries.
        
        Args:
            category_summaries: List of summaries from individual categories
            metrics: Overall metrics for context
            
        Returns:
            Formatted prompt
        """
        # Join the summaries
        all_summaries = "\n".join(category_summaries)
        
        prompt = f"""
You are creating an overall summary for the InstalledPrograms section of a Windows system state snapshot.

You have been provided with summaries from multiple program categories. Create a consolidated overall summary that captures the key insights.

System metrics:
- Total installed programs: {metrics['total_programs']}
- Recent installations (last 30 days): {metrics['recent_installations_count']}
- Security software: {metrics['security_software_count']} programs
- Development tools: {metrics['development_tools_count']} programs
- Utility software: {metrics['utility_software_count']} programs
- Potential bloatware: {metrics['potential_bloatware_count']} programs

Category summaries:
{all_summaries}

Provide your response as JSON with the following structure:
{{
  "summary": "Comprehensive overall assessment of the installed programs that synthesizes all the individual category analyses"
}}

Important: Respond ONLY with valid JSON, no other text before or after.
"""
        return prompt