"""
Registry for section-specific analyzers
"""

import logging
from typing import Dict, Type, Optional

from prompts.base_section_analyzer import BaseSectionAnalyzer

logger = logging.getLogger(__name__)

class SectionAnalyzerRegistry:
    """
    Registry for section-specific analyzers.
    
    This class manages the registration and retrieval of analyzers for different
    sections of the system state snapshot.
    """
    
    _registry: Dict[str, Type[BaseSectionAnalyzer]] = {}
    
    @classmethod
    def register(cls, analyzer_class: Type[BaseSectionAnalyzer]) -> Type[BaseSectionAnalyzer]:
        """
        Register a section analyzer class.
        
        Can be used as a decorator:
        
        @SectionAnalyzerRegistry.register
        class PathAnalyzer(BaseSectionAnalyzer):
            # ...
        
        Args:
            analyzer_class: The analyzer class to register
            
        Returns:
            The analyzer class (for decorator usage)
        """
        # Create a temporary instance to get the section name
        instance = analyzer_class()
        section_name = instance.section_name
        
        # Register the class
        cls._registry[section_name] = analyzer_class
        logger.debug(f"Registered analyzer for section: {section_name}")
        
        return analyzer_class
    
    @classmethod
    def get_analyzer(cls, section_name: str) -> Optional[BaseSectionAnalyzer]:
        """
        Get an instance of the analyzer for the specified section.
        
        Args:
            section_name: Name of the section
            
        Returns:
            Instance of the appropriate analyzer, or None if not found
        """
        analyzer_class = cls._registry.get(section_name)
        if analyzer_class is None:
            #logger.warning(f"No analyzer registered for section: {section_name}")
            return None
            
        return analyzer_class()
    
    @classmethod
    def has_analyzer(cls, section_name: str) -> bool:
        """
        Check if an analyzer is registered for the specified section.
        
        Args:
            section_name: Name of the section
            
        Returns:
            True if an analyzer is registered, False otherwise
        """
        return section_name in cls._registry
    
    @classmethod
    def get_all_section_names(cls) -> list[str]:
        """
        Get all registered section names.
        
        Returns:
            List of registered section names
        """
        return list(cls._registry.keys())