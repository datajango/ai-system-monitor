"""
Package for section-specific analyzers.

This package contains individual analyzer implementations for different
sections of the system state snapshot.

The analyzers are registered with the SectionAnalyzerRegistry when imported.
"""

# Import all analyzer modules to ensure they're registered
from prompts.analyzers.path_analyzer import PathAnalyzer
from prompts.analyzers.installed_programs_analyzer import InstalledProgramsAnalyzer
from prompts.analyzers.startup_programs_analyzer import StartupProgramsAnalyzer
from prompts.analyzers.running_services_analyzer import RunningServicesAnalyzer
from prompts.analyzers.disk_space_analyzer import DiskSpaceAnalyzer
from prompts.analyzers.performance_data_analyzer import PerformanceDataAnalyzer
from prompts.analyzers.network_analyzer import NetworkAnalyzer
from prompts.analyzers.environment_analyzer import EnvironmentAnalyzer

# Import additional analyzers here as they're created
# etc.