"""
Section-specific prompts for analyzing different types of system data
"""

# Default prompt for sections without specific prompts
DEFAULT_SECTION_PROMPT = """
Analyze this section data:
1. Identify potential issues or security risks
2. Find optimization opportunities 
3. Look for unusual or suspicious configurations
4. Suggest concrete improvements
5. Prioritize recommendations by importance
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