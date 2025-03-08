"""
Configuration management for LM Studio Analyzer
"""

import json
import logging
from pathlib import Path
from typing import Optional
import datetime

logger = logging.getLogger(__name__)

class AnalyzerConfig:
    """
    Configuration for the LM Studio Analyzer.
    """
    
    def __init__(
        self,
        server_url: str = "http://localhost:1234/v1",
        max_tokens: int = 4096,
        temperature: float = 0.7,
        config_path: Optional[str] = None
    ):
        """
        Initialize the analyzer configuration.
        
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