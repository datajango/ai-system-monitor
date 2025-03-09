# File path: install_env_support.py (can be placed anywhere)
#!/usr/bin/env python3
"""
Installation script for LM Studio Analyzer .env support
"""

import os
import shutil
import sys
import logging
import subprocess
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Files to install
FILES_TO_INSTALL = {
    "env_config.py": "env_config.py",
    "config.py": "config.py",
    "main.py": "main.py",
    "analyzer.py": "analyzer.py",
    "models/lm_studio_client.py": "models/lm_studio_client.py",
    "requirements.txt": "requirements.txt"
}

def install_env_support(base_dir: str) -> None:
    """
    Install .env support to the LM Studio Analyzer.
    
    Args:
        base_dir: Base directory of the LM Studio Analyzer
    """
    base_path = Path(base_dir)
    
    # Check if base directory exists
    if not base_path.exists():
        if input(f"Directory {base_path} doesn't exist. Create it? (y/n): ").lower() == 'y':
            base_path.mkdir(parents=True)
        else:
            logger.error("Installation cancelled.")
            sys.exit(1)
    
    # Create backup directory
    backup_dir = base_path / "backups" / f"pre_env_support_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Created backup directory: {backup_dir}")
    
    # Back up original files
    for src_rel_path, dest_rel_path in FILES_TO_INSTALL.items():
        dest_path = base_path / dest_rel_path
        if dest_path.exists():
            backup_path = backup_dir / dest_rel_path
            # Ensure parent directory exists
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dest_path, backup_path)
            logger.info(f"Backed up {dest_path} to {backup_path}")
    
    # Get script directory
    script_dir = Path(__file__).parent
    
    # Install new files
    for src_rel_path, dest_rel_path in FILES_TO_INSTALL.items():
        src_path = script_dir / src_rel_path
        if not src_path.exists():
            logger.warning(f"Source file not found: {src_path}")
            continue
        
        dest_path = base_path / dest_rel_path
        # Create parent directories if needed
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy file
        shutil.copy2(src_path, dest_path)
        logger.info(f"Installed {src_path} to {dest_path}")
    
    # Install requirements
    try:
        logger.info("Installing Python dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", base_path / "requirements.txt"], check=True)
        logger.info("Dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        logger.error(f"Error installing dependencies: {e}")
        logger.info("Please install requirements manually: pip install -r requirements.txt")
    
    # Create default .env file
    env_path = base_path / ".env"
    if not env_path.exists():
        create_default_env_file(env_path)
    
    logger.info("\n.env support installed successfully!")
    logger.info(f"Default .env file location: {env_path}")
    logger.info("You can also use '--create-env' to create a new .env file.")
    logger.info("Use '--help' to see all available options.")

def create_default_env_file(path: Path) -> None:
    """
    Create a default .env file.
    
    Args:
        path: Path to create .env file
    """
    content = """# LM Studio Analyzer Configuration

# LLM Server URL - REPLACE WITH YOUR SERVER URL
LLM_SERVER_URL=http://192.168.1.8:1234/v1

# LLM Model to use (leave empty to use server default)
LLM_MODEL=gemma-2-9b-it

# LLM Generation Parameters
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0.7

# Analysis Output Defaults
# DEFAULT_OUTPUT_DIR=./analysis_results
"""
    
    with open(path, 'w') as f:
        f.write(content)
    
    logger.info(f"Created default .env file at {path}")

def main():
    """
    Main entry point.
    """
    # Parse arguments
    if len(sys.argv) > 1:
        base_dir = sys.argv[1]
    else:
        base_dir = input("Enter the base directory of the LM Studio Analyzer: ")
    
    # Install .env support
    install_env_support(base_dir)

if __name__ == "__main__":
    main()