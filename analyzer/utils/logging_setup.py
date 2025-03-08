"""
Logging configuration for LM Studio Analyzer
"""

import logging
from typing import Optional

def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """
    Set up and configure logging for the application.
    
    Args:
        level: Logging level (default: INFO)
        
    Returns:
        Configured logger
    """
    # Root logger configuration
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Create and return the application logger
    logger = logging.getLogger("system_analyzer")
    logger.setLevel(level)
    
    return logger