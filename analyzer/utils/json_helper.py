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