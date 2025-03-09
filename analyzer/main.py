#!/usr/bin/env python3
"""
LM Studio Analyzer for System State Monitor - Main Entry Point

This script analyzes system state snapshots from the System State Monitor by
sending the data to LM Studio for analysis and recommendations.
"""

import argparse
import json
import os
import sys
import logging
import traceback
import shutil
import glob
from pathlib import Path

from analyzer import SystemStateAnalyzer
from config import AnalyzerConfig
from env_config import create_default_env_file, load_env_config
from utils.logging_setup import setup_logging
from prompts.section_analyzers_registry import SectionAnalyzerRegistry

def fix_server_url(url):
    """
    Fix server URL to ensure it's properly formatted.
    
    Args:
        url: The server URL to fix
        
    Returns:
        Properly formatted server URL
    """
    if not url:
        return "http://localhost:1234/v1"
        
    # If URL ends with '/models', remove it
    if url.endswith('/models'):
        url = url[:-7]
    
    # Ensure URL doesn't have trailing slash before adding path
    url = url.rstrip('/')
    
    # Add /v1 if not present
    if not url.endswith('/v1'):
        if '/v1/' not in url:
            url = f"{url}/v1"
    
    # Log the fixed URL
    print(f"Using server URL: {url}")
    
    return url

def derive_output_paths(snapshot_path, output_base, output_dir=None):
    """
    Derive output paths based on snapshot name.
    
    Args:
        snapshot_path: Path to the snapshot directory
        output_base: Base path for output file
        output_dir: Directory for individual section outputs
        
    Returns:
        Tuple of (output_file, output_dir)
    """
    snapshot = Path(snapshot_path)
    snapshot_name = snapshot.name
    
    # Handle the output file
    output_file = None
    if output_base:
        if os.path.isdir(output_base):
            # If output_base is a directory, append snapshot name and analysis.json
            output_path = Path(output_base) / snapshot_name
            output_path.mkdir(parents=True, exist_ok=True)
            output_file = str(output_path / "analysis.json")
        else:
            # If it's a file path, use it directly
            output_file = output_base
    
    # Handle the output directory
    output_directory = None
    if output_dir:
        # Always append snapshot name to the output directory
        section_path = Path(output_dir) / snapshot_name
        section_path.mkdir(parents=True, exist_ok=True)
        output_directory = str(section_path)
            
    return output_file, output_directory

def find_snapshot_directories(input_dir):
    """
    Find all system state snapshot directories in the input directory.
    
    Args:
        input_dir: Path to the directory containing snapshot folders
        
    Returns:
        List of paths to snapshot directories
    """
    pattern = os.path.join(input_dir, "SystemState_*")
    return [path for path in glob.glob(pattern) if os.path.isdir(path)]

def process_snapshot(analyzer, snapshot_path, analysis_focus, output_file, output_dir, clean=False):
    """
    Process a single snapshot.
    
    Args:
        analyzer: Instance of SystemStateAnalyzer
        snapshot_path: Path to the snapshot directory
        analysis_focus: List of sections to focus on
        output_file: Path to save the combined analysis
        output_dir: Directory for individual section outputs
        clean: Whether to clean output directories before analysis
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Derive output paths
        output_file, output_dir = derive_output_paths(snapshot_path, output_file, output_dir)
        
        # Clean output directories if requested
        if clean:
            if output_file:
                output_file_path = Path(output_file)
                if output_file_path.exists():
                    output_file_path.unlink()
                    logger.info(f"Removed existing output file: {output_file}")
            
            if output_dir:
                output_dir_path = Path(output_dir)
                if output_dir_path.exists():
                    shutil.rmtree(output_dir_path)
                    logger.info(f"Removed existing output directory: {output_dir}")
                # Recreate the directory
                output_dir_path.mkdir(parents=True, exist_ok=True)
        
        if output_file:
            logger.info(f"Analysis will be saved to: {output_file}")
        if output_dir:
            logger.info(f"Section analyses will be saved to: {output_dir}")
            
        # Analyze snapshot
        analyzer.analyze_snapshot(
            snapshot_path=snapshot_path,
            analysis_focus=analysis_focus,
            output_file=output_file,
            output_dir=output_dir
        )
        
        return True
    except Exception as e:
        logger.error(f"Error processing snapshot {snapshot_path}: {str(e)}")
        return False

def main():
    """
    Main entry point.
    """
    # Setup logging
    global logger
    logger = setup_logging()
    
    # Determine default config paths
    default_config_path = os.path.join(
        os.path.expanduser("~"), 
        ".config", 
        "system-monitor", 
        "lm-studio-config.json"
    )
    
    default_env_path = os.path.join(
        os.path.expanduser("~"), 
        ".config", 
        "system-monitor", 
        ".env"
    )
    
    # Parse arguments
    parser = argparse.ArgumentParser(
        description="Analyze system state snapshots using LM Studio for insights and recommendations"
    )
    parser.add_argument(
        "snapshot_path", 
        nargs="?",
        help="Path to the system state snapshot directory"
    )
    parser.add_argument(
        "--input-dir", "-i",
        help="Directory containing multiple snapshot folders to process"
    )
    parser.add_argument(
        "--server-url", "-u",
        help="URL of the LM Studio server (overrides .env and config)"
    )
    parser.add_argument(
        "--model", "-m",
        help="Specific model to use for analysis (overrides .env and config)"
    )
    parser.add_argument(
        "--max-tokens", "-t",
        type=int,
        help="Maximum number of tokens for the response (overrides .env and config)"
    )
    parser.add_argument(
        "--temperature", "-temp",
        type=float,
        help="Temperature for generation (0.0-1.0) (overrides .env and config)"
    )
    parser.add_argument(
        "--config", "-c",
        default=default_config_path,
        help="Path to JSON configuration file"
    )
    parser.add_argument(
        "--env-file", "-e",
        help="Path to .env configuration file"
    )
    parser.add_argument(
        "--use-config", "-uc",
        action="store_true",
        help="Use JSON configuration file"
    )
    parser.add_argument(
        "--save-config", "-sc",
        action="store_true",
        help="Save configuration to JSON file"
    )
    parser.add_argument(
        "--save-env", "-se",
        action="store_true",
        help="Save configuration to .env file"
    )
    parser.add_argument(
        "--create-env", "-ce",
        action="store_true",
        help="Create a default .env file"
    )
    parser.add_argument(
        "--output", "-o",
        help="Path to save combined analysis output (JSON format). If directory is specified, snapshot name will be appended automatically."
    )
    parser.add_argument(
        "--output-dir", "-od",
        help="Directory to save individual section analyses. If specified, snapshot name will be appended automatically."
    )
    parser.add_argument(
        "--focus", "-f",
        nargs="+",
        help="Sections to focus analysis on (space-separated)"
    )
    parser.add_argument(
        "--list-analyzers", "-la",
        action="store_true",
        help="List all available section analyzers"
    )
    parser.add_argument(
        "--list-models", "-lm",
        action="store_true",
        help="List available models on the server"
    )
    parser.add_argument(
        "--clean", "-cl",
        action="store_true",
        help="Remove existing output directory before analysis"
    )
    parser.add_argument(
        "--debug", "-d",
        action="store_true",
        help="Enable debug logging"
    )
    parser.add_argument(
        "--show-traceback", "-st",
        action="store_true",
        help="Always show full stack traces for errors (default behavior with --debug)"
    )
    
    args = parser.parse_args()
    
    # Set log level
    if args.debug:
        logger.setLevel(logging.DEBUG)
    
    # Import analyzers to ensure they're registered
    import prompts.analyzers
    
    # Create default .env file if requested
    if args.create_env:
        env_path = args.env_file if args.env_file else default_env_path
        create_default_env_file(env_path)
        print(f"Created default .env file at: {env_path}")
        if not args.snapshot_path and not args.input_dir:  # Exit if only creating .env file
            return
    
    # List available analyzers if requested
    if args.list_analyzers:
        print("Available section analyzers:")
        for section_name in SectionAnalyzerRegistry.get_all_section_names():
            print(f"  - {section_name}")
        return
    
    # Load .env file directly first
    env_config = {}
    if args.env_file:
        env_config = load_env_config(args.env_file)
    else:
        env_config = load_env_config()
    
    # Get server URL from .env directly as a fallback
    env_server_url = env_config.get('LLM_SERVER_URL')
    
    # Create configuration (loading from .env first, then JSON, then CLI overrides)
    config = AnalyzerConfig(
        server_url=args.server_url,
        model=args.model,
        max_tokens=args.max_tokens,
        temperature=args.temperature,
        config_path=args.config if args.use_config or args.save_config else None,
        env_path=args.env_file
    )
    
    # List available models if requested
    if args.list_models:
        try:
            import requests
            
            # Use server URL from command line, config, or direct from .env
            server_url = args.server_url or config.server_url or env_server_url or "http://localhost:1234/v1"
            print(f"Initial server URL: {server_url}")
            
            # Fix the server URL
            server_url = fix_server_url(server_url)
                    
            # Ensure we're using the right base URL for models endpoint
            models_url = f"{server_url}/models"
            print(f"Querying models at: {models_url}")
            
            response = requests.get(models_url)
            models_data = response.json()
            
            print("\nAvailable models on server:")
            
            if "data" in models_data:
                for model in models_data["data"]:
                    print(f"  - {model['id']}")
            else:
                print("  No models found or unexpected response format")
            print()
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            if args.debug or args.show_traceback:
                traceback.print_exc()
        return
    
    # Save config if requested
    if args.save_config:
        config.save_config()
        
    # Save .env if requested
    if args.save_env:
        env_path = args.env_file if args.env_file else '.env'
        config.save_env_config(env_path)
    
    # Check if snapshot path or input directory is provided
    if not args.snapshot_path and not args.input_dir:
        logger.error("No snapshot path or input directory provided")
        parser.print_help()
        sys.exit(1)
        
    try:
        # Initialize analyzer
        analyzer = SystemStateAnalyzer(config)
        
        if args.input_dir:
            # Process all snapshots in the input directory
            snapshots = find_snapshot_directories(args.input_dir)
            
            if not snapshots:
                logger.error(f"No snapshot directories found in {args.input_dir}")
                sys.exit(1)
            
            logger.info(f"Found {len(snapshots)} snapshot directories to process")
            
            successful = 0
            failed = 0
            
            for snapshot_path in snapshots:
                logger.info(f"\n{'='*80}\nProcessing snapshot: {snapshot_path}\n{'='*80}")
                
                if process_snapshot(
                    analyzer=analyzer,
                    snapshot_path=snapshot_path,
                    analysis_focus=args.focus,
                    output_file=args.output,
                    output_dir=args.output_dir,
                    clean=args.clean
                ):
                    successful += 1
                else:
                    failed += 1
            
            logger.info(f"\nProcessing complete. Successfully processed {successful} snapshots, {failed} failed.")
            
        else:
            # Process single snapshot
            snapshot_path = args.snapshot_path
            
            process_snapshot(
                analyzer=analyzer,
                snapshot_path=snapshot_path,
                analysis_focus=args.focus,
                output_file=args.output,
                output_dir=args.output_dir,
                clean=args.clean
            )
            
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        # Always print traceback with --debug or --show-traceback
        if args.debug or args.show_traceback:
            print("\nDetailed traceback:")
            traceback.print_exc()
        else:
            print("\nRun with --show-traceback or --debug for detailed error information")
        sys.exit(1)

if __name__ == "__main__":
    main()