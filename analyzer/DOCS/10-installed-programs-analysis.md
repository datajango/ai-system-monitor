# Installed Programs Analyzer Component

## Overview

The Installed Programs Analyzer is a specialized component of the System State Analyzer that examines software applications installed on the Windows system. This component analyzes data collected from the `InstalledPrograms.json` file produced by the System State Collector, providing insights into software inventory, potential security risks, bloatware, and optimization opportunities.

## Input Data Source

**Filename**: `InstalledPrograms.json`

According to the documentation in `10-installed-programs.md`, the Installed Programs collector gathers information about:
- Software applications registered through standard Windows installation mechanisms
- Program names, publishers, versions, and installation dates
- Installation locations and registry entries

The collection is performed by the `ProgramCollector.ps1` script, which queries the Windows Registry to identify installed applications across different registry locations, examining both system-wide installations and user-specific installations.

## Analyzer Implementation

The source code reveals a dedicated `InstalledProgramsAnalyzer` class with sophisticated functionality:

```python
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
```

This class implements several notable features:
1. It enables chunking (`USES_CHUNKING = True`) to handle large datasets
2. It sets a custom maximum JSON length (1500 characters) for truncation
3. It defines a `SOFTWARE_CATEGORIES` dictionary for classifying applications into categories:
   - Security software
   - Development tools
   - Utility software
   - Potential bloatware

## Key Analysis Methods

The `InstalledProgramsAnalyzer` implements several key methods:

### Section Name Property

```python
@property
def section_name(self) -> str:
    return "InstalledPrograms"
```

### Optional Input Files Property

```python
@property
def optional_input_files(self) -> Set[str]:
    # Optionally use StartupPrograms.json for correlation
    return {"StartupPrograms.json"}
```

This indicates that the Installed Programs analyzer may use additional data from the Startup Programs collector for enhanced analysis.

### Program Categorization Method

```python
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
```

This method analyzes each program's name to categorize it based on keyword matching against the defined categories.

### Extract Key Metrics Method

```python
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
            
            # ... [additional processing logic] ...
            
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
```

This method processes the installed programs data to extract key metrics such as:
- Total count of installed programs
- Counts by category (security, development, utilities, bloatware)
- Recent installations (past 30 days)
- Potential bloatware detected
- Security software present
- Particularly large programs

### Create Prompt Method

```python
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
    
    # ... [additional formatting for display] ...
    
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
```

This method creates a specialized prompt for the LLM that includes:
1. Specific analysis instructions for installed programs
2. Key metrics extracted by the `extract_key_metrics` method
3. Additional context about startup programs if available
4. Formatted displays of recent installations, security software, bloatware, and large programs
5. The truncated JSON data for reference

### Chunking Analysis Method

One of the most sophisticated aspects of this analyzer is its chunking capability, implemented in the `analyze_with_chunking` method:

```python
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
        
        # ... [LLM processing logic] ...
        
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
            # ... [error handling] ...
            
        finally:
            # ... [log saving logic] ...
    
    # Create aggregated analysis
    aggregated_analysis = {
        "issues": all_issues,
        "optimizations": all_optimizations,
    }
    
    # Generate an overall summary from category summaries
    if category_summaries:
        overall_summary_prompt = self._create_overall_summary_prompt(category_summaries, metrics)
        
        # ... [summary generation logic] ...
        
    else:
        aggregated_analysis["summary"] = "No analysis could be generated for any program categories."
    
    return aggregated_analysis
```

This method implements a sophisticated chunking strategy:
1. It categorizes programs into groups (security, bloatware, development, utilities, recent, other)
2. It analyzes each category separately to avoid token limits
3. It samples a limited number of programs from each category
4. It generates category-specific prompts
5. It aggregates the results from all categories
6. It creates a final summary based on all category analyses

## Output Structure

The output of the Installed Programs analyzer is stored in `InstalledProgramsAnalysis.json`. Based on the chunking implementation, the output structure is:

```json
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "security|bloatware|development|utilities|recent|other",
      "title": "Description of the issue",
      "description": "Detailed explanation of the problem",
      "recommendation": "Suggested action to resolve the issue"
    }
  ],
  "optimizations": [
    {
      "impact": "high|medium|low",
      "category": "security|bloatware|development|utilities|recent|other",
      "title": "Optimization opportunity",
      "description": "Explanation of the optimization",
      "recommendation": "Steps to implement the optimization"
    }
  ],
  "summary": "Overall assessment of installed programs"
}
```

Additionally, since this analyzer uses chunking, the LLM interactions are split into multiple files:
- `InstalledPrograms_security_llm_interaction.json`
- `InstalledPrograms_bloatware_llm_interaction.json`
- `InstalledPrograms_development_llm_interaction.json`
- `InstalledPrograms_utilities_llm_interaction.json`
- `InstalledPrograms_recent_llm_interaction.json`
- `InstalledPrograms_other_llm_interaction.json`
- `InstalledPrograms_summary_llm_interaction.json`

## Key Analysis Areas

Based on the prompt structure and code implementation, the analyzer focuses on:

1. **Security Assessment**:
   - Identifying outdated software with potential security vulnerabilities
   - Checking for security software presence and coverage
   - Evaluating recently installed software for security implications

2. **Bloatware Detection**:
   - Identifying potentially unwanted programs
   - Finding unnecessary software that may impact performance
   - Detecting trial software or promotional offerings

3. **Software Conflicts and Redundancies**:
   - Checking for multiple programs serving the same function
   - Identifying potential conflicts between applications
   - Suggesting consolidation or removal of redundant software

4. **Software Categorization**:
   - Classifying software into functional categories
   - Identifying development tools and environments
   - Categorizing utility and maintenance software

5. **Installation Analysis**:
   - Tracking recent installations (past 30 days)
   - Analyzing installation patterns and sources
   - Identifying unusual or suspicious installations

## Registry Sources

The documentation indicates that the collector queries multiple registry locations:

1. **System-Wide 32-bit Applications**: `HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*`
2. **System-Wide 64-bit Applications**: `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*`
3. **User-Specific Applications**: `HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*`

## Correlation with Other Analyzers

The Installed Programs analyzer complements and correlates with:

- **StartupPrograms**: Shows which installed applications are configured to run at startup
- **RegistrySettings**: Contains additional application configuration data in the registry
- **WindowsFeatures**: Identifies Windows features that may be required by certain applications
- **PythonInstallations**: Provides deeper details on Python environments beyond basic installation data
- **Browsers**: Offers browser-specific information for web applications and extensions
- **DiskSpace**: Helps understand the storage impact of installed applications

## LLM Interaction Flow

Due to the chunking implementation, the LLM interaction flow is more complex:

1. The analyzer loads the `InstalledPrograms.json` data
2. It categorizes programs into different groups (security, bloatware, etc.)
3. For each non-empty category:
   a. It samples a limited number of programs
   b. It creates a category-specific prompt
   c. It sends the prompt to the LLM
   d. It processes the response and tags issues/optimizations with the category
4. It aggregates all category-specific analyses
5. It creates a final summary prompt with all category summaries
6. It sends the summary prompt to the LLM
7. It adds the summary to the aggregated analysis
8. The final result is saved as `InstalledProgramsAnalysis.json`
9. All LLM interactions are saved in category-specific log files

## Current Limitations

- Limited to programs registered through standard Windows installer mechanisms
- May miss portable applications or custom installations
- Installation date format varies and may be absent for some software
- Cannot directly inspect application files or sizes
- Limited ability to detect actual software usage patterns

## Improvement Opportunities

Based on the documentation in `10-installed-programs.md`, potential improvements include:

1. Adding installation size information to help with storage management
2. Including installation path details to help locate program files
3. Capturing uninstall commands for easier removal
4. Adding update information and patch status for installed software
5. Including application usage data (when last used, frequency, etc.)
6. Adding installation source information (download URL, media, etc.)
7. Enhancing detection of UWP and Microsoft Store applications
