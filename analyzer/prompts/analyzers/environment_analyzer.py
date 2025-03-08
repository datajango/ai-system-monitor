"""
Environment variables analyzer
"""

from typing import Dict, List, Any, Optional, Set
import re

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


@SectionAnalyzerRegistry.register
class EnvironmentAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for environment variables data.
    """
    
    # Critical environment variables for Windows
    CRITICAL_VARIABLES = {
        "SystemRoot": "Windows system directory",
        "windir": "Windows directory",
        "TEMP": "Temporary files location",
        "TMP": "Temporary files location",
        "PATHEXT": "Executable file extensions",
        "COMSPEC": "Command processor path",
        "ProgramFiles": "Program Files directory",
        "ProgramFiles(x86)": "Program Files (x86) directory",
        "ProgramData": "Program data directory",
        "ALLUSERSPROFILE": "All users profile directory",
        "APPDATA": "Application data directory",
        "LOCALAPPDATA": "Local application data directory",
        "USERPROFILE": "User profile directory",
        "Path": "Executable search path",
        "SystemDrive": "System drive letter",
        "COMPUTERNAME": "Computer name",
        "USERNAME": "User name",
        "HOMEDRIVE": "User home drive",
        "HOMEPATH": "User home path"
    }
    
    # Potentially unnecessary or legacy variables
    LEGACY_VARIABLES = {
        "OS2LIBPATH": "OS/2 library path (legacy)",
        "INCLUDE": "C++ include file path (legacy if not developing)",
        "LIB": "C++ library path (legacy if not developing)",
        "OS": "Operating system name (often redundant)",
        "PROCESSOR_ARCHITECTURE": "Processor architecture (rarely used)",
        "NUMBER_OF_PROCESSORS": "Processor count (rarely used directly)",
        "PROCESSOR_IDENTIFIER": "Processor identifier (rarely used)",
        "PROCESSOR_LEVEL": "Processor level (rarely used)",
        "PROCESSOR_REVISION": "Processor revision (rarely used)"
    }
    
    # Security-sensitive variables that should be checked
    SECURITY_SENSITIVE = {
        "Path": "May contain writable or insecure directories",
        "PATHEXT": "May allow unauthorized file types to execute",
        "TEMP": "Should be in a secure location",
        "TMP": "Should be in a secure location"
    }
    
    # Development variables to check for
    DEVELOPMENT_VARIABLES = [
        "JAVA_HOME", "JRE_HOME", "MAVEN_HOME", "ANT_HOME", "GRADLE_HOME", 
        "PYTHON", "PYTHONHOME", "PYTHONPATH", "NODE_PATH", "GOROOT", "GOPATH",
        "ANDROID_HOME", "ANDROID_SDK_ROOT", "DOTNET_ROOT", "VS", "VSINSTALLDIR",
        "RUSTUP_HOME", "CARGO_HOME", "RUBY_HOME", "GEM_HOME", "PHP_HOME"
    ]
    
    # Common variable expansions to check for issues
    EXPANSION_PATTERNS = [
        r"%([^%]+)%",  # Windows-style %VAR%
        r"\$([A-Za-z0-9_]+)",  # Unix-style $VAR
        r"\$\{([^}]+)\}"  # Unix-style ${VAR}
    ]
    
    @property
    def section_name(self) -> str:
        return "Environment"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Path environment is particularly related to environment variables
        return {"Path.json"}
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from environment variables data.
        
        Args:
            section_data: The environment variables section data
            
        Returns:
            Dictionary of key metrics
        """
        if not isinstance(section_data, dict):
            return {"error": "Invalid environment data format"}
        
        # Extract environment variable categories
        system_vars = section_data.get("SystemVariables", [])
        user_vars = section_data.get("UserVariables", [])
        process_vars = section_data.get("ProcessVariables", [])
        
        if not isinstance(system_vars, list):
            system_vars = []
        if not isinstance(user_vars, list):
            user_vars = []
        if not isinstance(process_vars, list):
            process_vars = []
        
        # Count variables by category
        system_count = len(system_vars)
        user_count = len(user_vars)
        process_count = len(process_vars)
        
        # Check for critical variables
        critical_vars_found = {}
        critical_vars_missing = []
        
        # Combine all variables for searching
        all_vars = {}
        for var in system_vars + user_vars + process_vars:
            name = var.get("Name", "")
            value = var.get("Value", "")
            all_vars[name] = value
            
            if name in self.CRITICAL_VARIABLES:
                critical_vars_found[name] = value
        
        # Check which critical variables are missing
        for var_name in self.CRITICAL_VARIABLES:
            if var_name not in critical_vars_found:
                critical_vars_missing.append(var_name)
        
        # Check for security-sensitive variables issues
        security_concerns = []
        
        # Check PATH for security issues (if available)
        if "Path" in all_vars:
            path_value = all_vars["Path"]
            path_entries = path_value.split(";")
            
            # Look for potentially problematic entries
            for entry in path_entries:
                # Check for empty entries
                if not entry.strip():
                    security_concerns.append({
                        "variable": "Path",
                        "issue": "Empty entry in Path",
                        "details": "Empty entries in Path can lead to current directory execution"
                    })
                    break
        
        # Check for development variables
        dev_vars_present = []
        for var in self.DEVELOPMENT_VARIABLES:
            if var in all_vars:
                dev_vars_present.append(var)
        
        # Check for variables with recursive or circular references
        recursive_vars = []
        for name, value in all_vars.items():
            # Check for self-references
            if f"%{name}%" in value or f"${name}" in value or f"${{{name}}}" in value:
                recursive_vars.append({
                    "name": name,
                    "value": value,
                    "issue": "Self-reference"
                })
                continue
                
            # Check for potential circular references (basic check)
            for pattern in self.EXPANSION_PATTERNS:
                matches = re.findall(pattern, value)
                for match in matches:
                    if match in all_vars and (f"%{name}%" in all_vars[match] or 
                                             f"${name}" in all_vars[match] or 
                                             f"${{{name}}}" in all_vars[match]):
                        recursive_vars.append({
                            "name": name,
                            "value": value,
                            "referenced_var": match,
                            "issue": "Potential circular reference"
                        })
                        break
        
        # Check for legacy variables
        legacy_vars_present = []
        for var in self.LEGACY_VARIABLES:
            if var in all_vars:
                legacy_vars_present.append(var)
        
        return {
            "counts": {
                "system": system_count,
                "user": user_count,
                "process": process_count,
                "total": system_count + user_count
            },
            "critical_variables": {
                "found": len(critical_vars_found),
                "missing": critical_vars_missing
            },
            "security": {
                "concerns": security_concerns
            },
            "development": {
                "variables": dev_vars_present
            },
            "issues": {
                "recursive": recursive_vars,
                "legacy": legacy_vars_present
            }
        }
    
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for environment variables analysis.
        
        Args:
            section_data: The environment variables data
            additional_data: Optional additional data from other sections
            
        Returns:
            Formatted prompt for environment variables analysis
        """
        # Format the data as JSON
        import json
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Format variable counts
        var_counts = f"Environment Variables: {metrics['counts']['total']} total variables"
        var_counts += f"\n  - System variables: {metrics['counts']['system']}"
        var_counts += f"\n  - User variables: {metrics['counts']['user']}"
        
        # Format critical variables information
        critical_vars = f"Critical Variables: {metrics['critical_variables']['found']} of {len(self.CRITICAL_VARIABLES)} found"
        
        # Format missing critical variables if any
        missing_critical = ""
        if metrics['critical_variables']['missing']:
            missing_list = ", ".join(metrics['critical_variables']['missing'])
            missing_critical = f"\nMissing critical variables: {missing_list}"
        
        # Format security concerns if any
        security_concerns = ""
        if metrics['security']['concerns']:
            security_concerns = "\nSecurity concerns detected:"
            for concern in metrics['security']['concerns']:
                security_concerns += f"\n  - {concern['variable']}: {concern['issue']} - {concern['details']}"
        
        # Format development variables if any
        dev_vars = ""
        if metrics['development']['variables']:
            dev_list = ", ".join(metrics['development']['variables'])
            dev_vars = f"\nDevelopment variables detected: {dev_list}"
        
        # Format recursive or circular references if any
        recursive_vars = ""
        if metrics['issues']['recursive']:
            recursive_vars = "\nRecursive or circular references detected:"
            for ref in metrics['issues']['recursive']:
                if "referenced_var" in ref:
                    recursive_vars += f"\n  - {ref['name']} references {ref['referenced_var']} which may form a circular reference"
                else:
                    recursive_vars += f"\n  - {ref['name']} references itself"
        
        # Format legacy variables if any
        legacy_vars = ""
        if metrics['issues']['legacy']:
            legacy_list = ", ".join(metrics['issues']['legacy'])
            legacy_vars = f"\nLegacy variables detected: {legacy_list}"
        
        # Add PATH context if available
        path_context = ""
        if additional_data and "Path" in additional_data:
            path_data = additional_data["Path"]
            if isinstance(path_data, list):
                # Count invalid paths
                invalid_paths = sum(1 for p in path_data if not p.get('Exists', True))
                total_paths = len(path_data)
                
                path_context = f"\nPATH variable contains {total_paths} entries ({invalid_paths} invalid/non-existent)"
        
        # Build specific analysis instructions
        prompt = f"""
Analyze the environment variables to identify configuration issues, security risks, and optimization opportunities:

1. Variable configuration assessment
   - Evaluate if critical environment variables are properly set
   - Check for missing or misconfigured important variables
   - Assess how variables interact with each other
   - Identify redundant or unnecessary variables

2. Security implications
   - Look for security risks in environment variable configuration
   - Check for insecure paths or configurations
   - Identify variables that might expose sensitive information
   - Assess if environment variables follow security best practices

3. Performance and compatibility
   - Evaluate if environment variables might impact system performance
   - Check for legacy or obsolete variables that are no longer needed
   - Identify variables that might cause compatibility issues
   - Assess if development environment configurations might affect stability

4. Configuration recommendations
   - Suggest ways to optimize environment variable configurations
   - Recommend security improvements for environment variables
   - Identify variables that should be added, removed, or modified
   - Provide best practices for environment variable management

Key metrics:
- {var_counts}
- {critical_vars}{missing_critical}{security_concerns}{dev_vars}{recursive_vars}{legacy_vars}{path_context}

The environment variables data for analysis:
```json
{section_json}
```
"""
        return prompt