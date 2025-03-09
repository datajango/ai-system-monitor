"""
Utility functions for JSON handling
"""

import json
import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def extract_json_from_response(response: str) -> Dict[str, Any]:
    """
    Extract JSON from the model's response, handling cases where the model
    might add extra text before or after the JSON.
    
    Args:
        response: The raw response from the model
        
    Returns:
        Parsed JSON object
    """
    # Try to parse the entire response as JSON first
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass
        
    # Find JSON-like content using regex
    json_match = re.search(r'({[\s\S]*})', response)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
            
    # More aggressive approach - try to find anything between curly braces
    try:
        start = response.find('{')
        end = response.rfind('}')
        if start != -1 and end != -1 and end > start:
            json_str = response[start:end+1]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass
        
    # If all else fails, return an error structure
    logger.error("Could not extract valid JSON from model response")
    logger.debug(f"Failed response: {response}")
    return {
        "error": True,
        "message": "Failed to parse model response as JSON",
        "raw_response": response
    }

def save_json_file(file_path: str, data: Any, indent: int = 2) -> bool:
    """
    Save data to a JSON file, handling encoding correctly.
    
    Args:
        file_path: Path where to save the file
        data: Data to save (must be JSON-serializable)
        indent: Indentation level for pretty-printing
        
    Returns:
        True if successful, False otherwise
    """
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error saving JSON to {file_path}: {str(e)}")
        return False

def load_json_file(file_path: str) -> Any:
    """
    Load data from a JSON file, handling different encodings.
    
    Args:
        file_path: Path to the JSON file
        
    Returns:
        Parsed JSON data
        
    Raises:
        ValueError: If the file cannot be parsed as JSON
    """
    try:
        # Try with utf-8-sig to handle BOM
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    except json.JSONDecodeError:
        # If that fails, try with regular utf-8
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise ValueError(f"Failed to parse {file_path} as JSON: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error reading {file_path}: {str(e)}")