"""
Data loading functionality for system state snapshots
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class SystemStateDataLoader:
    """
    Loads data from system state snapshots.
    """
    
    def load_snapshot_data(
        self, 
        snapshot_path: str, 
        analysis_focus: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Load data from a system state snapshot.
        
        Args:
            snapshot_path: Path to the snapshot directory
            analysis_focus: List of sections to focus on, or None for all sections
        
        Returns:
            Dictionary with metadata and section data
        """
        snapshot_dir = Path(snapshot_path)
        
        if not snapshot_dir.exists() or not snapshot_dir.is_dir():
            raise ValueError(f"Snapshot directory not found: {snapshot_dir}")
            
        # Load metadata
        metadata_file = snapshot_dir / "metadata.json"
        if not metadata_file.exists():
            raise ValueError(f"Metadata file not found: {metadata_file}")
            
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
            
        # Load index or get file list
        index_file = snapshot_dir / "index.json"
        if index_file.exists():
            with open(index_file, "r") as f:
                index = json.load(f)
        else:
            # Create index from files
            index = {}
            for file in snapshot_dir.glob("*.json"):
                if file.name not in ["metadata.json", "index.json"]:
                    index[file.stem] = file.name
        
        system_data = {
            "metadata": metadata,
            "sections": {}
        }
        
        # Determine which sections to include
        sections_to_include = []
        
        if not analysis_focus or "All" in analysis_focus:
            sections_to_include = list(index.keys())
        else:
            for section in analysis_focus:
                if section in index:
                    sections_to_include.append(section)
                else:
                    logger.warning(f"Section '{section}' not found in snapshot data")
        
        # Load each section
        for section in sections_to_include:
            section_file = snapshot_dir / index[section]
            
            if section_file.exists():
                with open(section_file, "r") as f:
                    section_data = json.load(f)
                    system_data["sections"][section] = section_data.get("Data")
            else:
                logger.warning(f"Section file not found: {section_file}")
                
        return system_data