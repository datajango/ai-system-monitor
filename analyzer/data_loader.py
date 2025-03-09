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
            
        try:
            # Use utf-8-sig encoding to handle files with BOM
            with open(metadata_file, "r", encoding="utf-8-sig") as f:
                metadata = json.load(f)
                logger.debug("Successfully loaded metadata.json")
        except json.JSONDecodeError as e:
            raise ValueError(f"Error parsing metadata.json: {str(e)}. Please check file format.") from e
        except Exception as e:
            raise ValueError(f"Error reading metadata.json: {str(e)}") from e
            
        # Load index or get file list
        index_file = snapshot_dir / "index.json"
        if index_file.exists():
            try:
                # Use utf-8-sig encoding to handle files with BOM
                with open(index_file, "r", encoding="utf-8-sig") as f:
                    index = json.load(f)
                    logger.debug("Successfully loaded index.json")
            except json.JSONDecodeError as e:
                raise ValueError(f"Error parsing index.json: {str(e)}. Please check file format.") from e
            except Exception as e:
                raise ValueError(f"Error reading index.json: {str(e)}") from e
        else:
            # Create index from files
            logger.info("No index.json found, creating index from directory contents")
            index = {}
            for file in snapshot_dir.glob("*.json"):
                if file.name not in ["metadata.json", "index.json"]:
                    index[file.stem] = file.name
            
            if not index:
                raise ValueError(f"No data files found in snapshot directory: {snapshot_dir}")
        
        system_data = {
            "metadata": metadata,
            "sections": {}
        }
        
        # Determine which sections to include
        sections_to_include = []
        
        if not analysis_focus or "All" in analysis_focus:
            sections_to_include = list(index.keys())
            logger.debug(f"Including all {len(sections_to_include)} sections")
        else:
            for section in analysis_focus:
                if section in index:
                    sections_to_include.append(section)
                else:
                    logger.warning(f"Section '{section}' not found in snapshot data")
            
            if not sections_to_include:
                raise ValueError(f"None of the specified sections {analysis_focus} were found in the snapshot")
        
        # Load each section
        loaded_sections = 0
        for section in sections_to_include:
            section_file = snapshot_dir / index[section]
            
            if section_file.exists():
                try:
                    # Use utf-8-sig encoding to handle files with BOM
                    with open(section_file, "r", encoding="utf-8-sig") as f:
                        section_data = json.load(f)
                        
                    # Check if the file has the expected structure
                    if not isinstance(section_data, dict) or "Data" not in section_data:
                        logger.warning(f"Section file {section_file} has unexpected format (missing 'Data' key)")
                        system_data["sections"][section] = section_data  # Use the whole file as data
                    else:
                        system_data["sections"][section] = section_data.get("Data")
                        
                    loaded_sections += 1
                    logger.debug(f"Successfully loaded section: {section}")
                except json.JSONDecodeError as e:
                    line_col = f"line {e.lineno}, column {e.colno}"
                    logger.error(f"Error parsing {section_file}: JSON error at {line_col} - {str(e)}")
                    system_data["sections"][section] = {"error": f"Failed to parse JSON: {str(e)} at {line_col}"}
                except Exception as e:
                    logger.error(f"Error loading section {section}: {str(e)}")
                    system_data["sections"][section] = {"error": f"Failed to load: {str(e)}"}
            else:
                logger.warning(f"Section file not found: {section_file}")
                system_data["sections"][section] = {"error": "File not found"}
        
        if loaded_sections == 0:
            raise ValueError(f"Failed to load any sections from {snapshot_path}")
                
        return system_data