"""
Client for interacting with LM Studio's API
"""

import logging
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)

class LMStudioClient:
    """
    Client for calling the LM Studio API.
    """
    
    def __init__(
        self,
        server_url: str = "http://localhost:1234/v1",
        max_tokens: int = 4096,
        temperature: float = 0.7
    ):
        """
        Initialize the LM Studio client.
        
        Args:
            server_url: URL of the LM Studio server
            max_tokens: Maximum number of tokens for the response
            temperature: Temperature for generation (0.0-1.0)
        """
        self.server_url = server_url
        self.max_tokens = max_tokens
        self.temperature = temperature
    
    def generate(self, prompt: str) -> str:
        """
        Call the LM Studio API to generate a response.
        
        Args:
            prompt: The prompt to send to the model
            
        Returns:
            Model's response text
        """
        completions_url = f"{self.server_url}/chat/completions"
        
        payload = {
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that provides detailed analysis of Windows system state data."},
                {"role": "user", "content": prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": False
        }
        
        try:
            response = requests.post(completions_url, json=payload)
            response.raise_for_status()
            
            response_data = response.json()
            return response_data["choices"][0]["message"]["content"]
            
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                status_code = e.response.status_code
                try:
                    error_data = e.response.json()
                    error_message = error_data.get('error', {}).get('message', str(e))
                except:
                    error_message = str(e)
                    
                logger.error(f"API error ({status_code}): {error_message}")
            else:
                logger.error(f"Connection """
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
    }error: {str(e)}")
                
            if "Connection refused" in str(e):
                logger.error("LM Studio server not running or not accessible at the configured URL.")
                logger.error("Make sure LM Studio is running and the server is started.")
                
            raise RuntimeError(f"Failed to get response from LM Studio: {str(e)}")