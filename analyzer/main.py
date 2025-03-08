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
from pathlib import Path

from analyzer import SystemStateAnalyzer
from config import AnalyzerConfig
from utils.logging_setup import setup_logging
from prompts.section_analyzers_registry import SectionAnalyzerRegistry

def main():
    """
    Main entry point.
    """
    # Setup logging
    logger = setup_logging()
    
    # Determine default config path
    default_config_path = os.path.join(
        os.path.expanduser("~"), 
        ".config", 
        "system-monitor", 
        "lm-studio-config.json"
    )
    
    # Parse arguments
    parser = argparse.ArgumentParser(
        description="Analyze system state snapshots using LM Studio for insights and recommendations"
    )
    parser.add_argument(
        "snapshot_path", 
        help="Path to the system state snapshot directory"
    )
    parser.add_argument(
        "--server-url", "-u",
        default="http://localhost:1234/v1",
        help="URL of the LM Studio server"
    )
    parser.add_argument(
        "--max-tokens", "-t",
        type=int,
        default=4096,
        help="Maximum number of tokens for the response"
    )
    parser.add_argument(
        "--temperature", "-temp",
        type=float,
        default=0.7,
        help="Temperature for generation (0.0-1.0)"
    )
    parser.add_argument(
        "--config", "-c",
        default=default_config_path,
        help="Path to configuration file"
    )
    parser.add_argument(
        "--use-config", "-uc",
        action="store_true",
        help="Use configuration file"
    )
    parser.add_argument(
        "--save-config", "-sc",
        action="store_true",
        help="Save configuration to file"
    )
    parser.add_argument(
        "--output", "-o",
        help="Path to save combined analysis output (JSON format)"
    )
    parser.add_argument(
        "--output-dir", "-od",
        help="Directory to save individual section analyses"
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
        "--debug", "-d",
        action="store_true",
        help="Enable debug logging"
    )
    
    args = parser.parse_args()
    
    # Set log level
    if args.debug:
        logger.setLevel(logging.DEBUG)
    
    # Import analyzers to ensure they're registered
    import prompts.analyzers
    
    # List available analyzers if requested
    if args.list_analyzers:
        print("Available section analyzers:")
        for section_name in SectionAnalyzerRegistry.get_all_section_names():
            print(f"  - {section_name}")
        return
        
    try:
        # Create configuration
        config = AnalyzerConfig(
            server_url=args.server_url,
            max_tokens=args.max_tokens,
            temperature=args.temperature,
            config_path=args.config if args.use_config or args.save_config else None
        )
        
        # Save config if requested
        if args.save_config:
            config.save_config()
            
        # Initialize analyzer
        analyzer = SystemStateAnalyzer(config)
            
        # Analyze snapshot
        analyzer.analyze_snapshot(
            snapshot_path=args.snapshot_path,
            analysis_focus=args.focus,
            output_file=args.output,
            output_dir=args.output_dir
        )
        
    except Exception as e:
        logger.error(f"Error: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()