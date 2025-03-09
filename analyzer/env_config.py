# File path: /path/to/your/analyzer/env_config.py
"""
Environment configuration loader for LM Studio Analyzer

This module handles loading configuration from .env files
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv, dotenv_values

logger = logging.getLogger(__name__)

def load_env_config(env_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load configuration from .env file.
    
    Args:
        env_path: Path to .env file. If None, will look in current directory,
                 then user's home directory.
    
    Returns:
        Dictionary with environment variables
    """
    # If specific path provided, try to load it
    if env_path:
        env_file = Path(env_path)
        if env_file.exists():
            config = dotenv_values(env_file)
            logger.info(f"Loaded configuration from {env_file}")
            return config
        else:
            logger.warning(f"Environment file not found: {env_file}")
            return {}
    
    # Try loading from current directory
    if Path('.env').exists():
        config = dotenv_values('.env')
        logger.info("Loaded configuration from ./.env")
        return config
    
    # Try loading from user's home directory
    home_env = Path.home() / '.env'
    if home_env.exists():
        config = dotenv_values(home_env)
        logger.info(f"Loaded configuration from {home_env}")
        return config
    
    # Try loading from config directory
    config_env = Path.home() / '.config' / 'system-monitor' / '.env'
    if config_env.exists():
        config = dotenv_values(config_env)
        logger.info(f"Loaded configuration from {config_env}")
        return config
    
    logger.warning("No .env file found")
    return {}

def create_default_env_file(path: str = '.env') -> None:
    """
    Create a default .env file with sample configuration.
    
    Args:
        path: Path to create .env file
    """
    env_file = Path(path)
    
    # Don't overwrite existing file
    if env_file.exists():
        logger.warning(f"Environment file already exists: {env_file}")
        return
    
    # Create parent directories if needed
    env_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Default .env content
    content = """# LM Studio Analyzer Configuration

# LLM Server URL
LLM_SERVER_URL=http://192.168.1.8:1234/v1

# LLM Model to use (leave empty to use server default)
LLM_MODEL=gemma-2-9b-it

# LLM Generation Parameters
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0.7

# Analysis Output Defaults
# DEFAULT_OUTPUT_DIR=./analysis_results
"""
    
    # Write the file
    with open(env_file, 'w') as f:
        f.write(content)
    
    logger.info(f"Created default environment file: {env_file}")

def get_env_value(key: str, default: Any = None) -> Any:
    """
    Get a value from environment variables.
    
    Args:
        key: Environment variable name
        default: Default value if not found
        
    Returns:
        Value from environment or default
    """
    return os.environ.get(key, default)