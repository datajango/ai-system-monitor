# File path: /path/to/your/analyzer/config.py
"""
Configuration management for LM Studio Analyzer with .env file support
"""

import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import datetime
import os

from env_config import load_env_config, get_env_value

logger = logging.getLogger(__name__)

class AnalyzerConfig:
    """
    Configuration for the LM Studio Analyzer with .env file support.
    """
    
    def __init__(
        self,
        server_url: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        config_path: Optional[str] = None,
        env_path: Optional[str] = None
    ):
        """
        Initialize the analyzer configuration.
        
        Args:
            server_url: URL of the LM Studio server (overrides .env)
            model: Model name to use for analysis (overrides .env)
            max_tokens: Maximum number of tokens for the response (overrides .env)
            temperature: Temperature for generation (overrides .env) (0.0-1.0)
            config_path: Path to JSON configuration file
            env_path: Path to .env file
        """
        # Load environment variables
        self._env_config = load_env_config(env_path)
        
        # Set default values from environment or defaults
        self.server_url = get_env_value('LLM_SERVER_URL', 'http://localhost:1234/v1')
        self.model = get_env_value('LLM_MODEL')
        
        # Convert numeric values from string to proper types
        try:
            env_max_tokens = get_env_value('LLM_MAX_TOKENS')
            self.max_tokens = int(env_max_tokens) if env_max_tokens else 4096
        except (ValueError, TypeError):
            self.max_tokens = 4096
            
        try:
            env_temp = get_env_value('LLM_TEMPERATURE')
            self.temperature = float(env_temp) if env_temp else 0.7
        except (ValueError, TypeError):
            self.temperature = 0.7
        
        self.config_path = config_path
        
        # Override with any explicitly provided values
        if server_url:
            self.server_url = server_url
        if model is not None:  # Allow empty string to clear model
            self.model = model
        if max_tokens:
            self.max_tokens = max_tokens
        if temperature is not None:
            self.temperature = temperature
        
        # Load JSON config if provided (highest priority)
        if config_path:
            self.load_config()
    
    @property
    def env_config(self) -> Dict[str, str]:
        """
        Get a copy of the environment configuration.
        
        Returns:
            Dictionary of environment configuration values
        """
        return dict(self._env_config)
            
    def load_config(self) -> None:
        """
        Load configuration from JSON file.
        """
        if not self.config_path:
            return
            
        config_file = Path(self.config_path)
        if config_file.exists():
            try:
                with open(config_file, "r") as f:
                    config = json.load(f)
                    
                # JSON config overrides .env settings
                if "server_url" in config:
                    self.server_url = config.get("server_url")
                if "model" in config:
                    self.model = config.get("model")
                if "max_tokens" in config:
                    self.max_tokens = config.get("max_tokens")
                if "temperature" in config:
                    self.temperature = config.get("temperature")
                
                logger.info(f"Loaded configuration from {config_file}")
                logger.info(f"Using server URL: {self.server_url}")
                if self.model:
                    logger.info(f"Using model: {self.model}")
                else:
                    logger.info("No specific model configured, using server default")
            except Exception as e:
                logger.warning(f"Error loading configuration: {e}")
        else:
            logger.warning(f"Configuration file not found: {config_file}")
            
    def save_config(self) -> None:
        """
        Save configuration to JSON file.
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
        
        # Only include model if it's specified
        if self.model:
            config["model"] = self.model
        
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)
            
        logger.info(f"Saved configuration to {config_file}")
    
    def save_env_config(self, path: str = '.env') -> None:
        """
        Save configuration to .env file.
        
        Args:
            path: Path to .env file
        """
        env_file = Path(path)
        
        # Create parent directories if needed
        env_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Build .env content
        content = "# LM Studio Analyzer Configuration\n\n"
        content += f"LLM_SERVER_URL={self.server_url}\n"
        
        if self.model:
            content += f"LLM_MODEL={self.model}\n"
        else:
            content += "# LLM_MODEL=\n"
            
        content += f"LLM_MAX_TOKENS={self.max_tokens}\n"
        content += f"LLM_TEMPERATURE={self.temperature}\n"
        
        # Write the file
        with open(env_file, 'w') as f:
            f.write(content)
        
        logger.info(f"Saved environment configuration to {env_file}")