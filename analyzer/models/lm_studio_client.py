# File path: /path/to/your/analyzer/models/lm_studio_client.py
"""
Modified client for interacting with LM Studio's API with model selection support
"""

import logging
import requests
from typing import Dict, Any, Optional
import traceback
import json

logger = logging.getLogger(__name__)

class LMStudioClient:
    """
    Client for calling the LM Studio API with model selection support.
    """
    
    def __init__(
        self,
        server_url: str = "http://localhost:1234/v1",
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ):
        """
        Initialize the LM Studio client.
        
        Args:
            server_url: URL of the LM Studio server
            model: Model to use (if None, server will use its default)
            max_tokens: Maximum number of tokens for the response
            temperature: Temperature for generation (0.0-1.0)
        """
        self.server_url = server_url
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        
        # Log initialization
        init_msg = f"Initialized LM Studio client with URL: {server_url}"
        if model:
            init_msg += f", Model: {model}"
        logger.debug(init_msg)
    
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
        
        # Add model if specified
        if self.model:
            payload["model"] = self.model
            
        logger.debug(f"Sending request to {completions_url} with model: {self.model or 'default'}")
        
        try:
            # Convert the payload to JSON to verify it's valid
            payload_json = json.dumps(payload)
            
            # Send the request
            response = requests.post(
                completions_url, 
                json=payload,
                timeout=120  # 2-minute timeout
            )
            response.raise_for_status()
            
            # Parse the response
            response_data = response.json()
            if not "choices" in response_data or len(response_data["choices"]) == 0:
                raise RuntimeError(f"No choices in response: {json.dumps(response_data)}")
                
            if not "message" in response_data["choices"][0]:
                raise RuntimeError(f"No message in first choice: {json.dumps(response_data['choices'][0])}")
                
            content = response_data["choices"][0]["message"]["content"]
            
            # Log success
            logger.debug(f"Generated response of {len(content)} characters")
            return content
            
        except requests.exceptions.RequestException as e:
            error_message = "Unknown error"
            status_code = None
            
            # Extract detailed error information if available
            if hasattr(e, 'response') and e.response is not None:
                status_code = e.response.status_code
                try:
                    error_data = e.response.json()
                    error_message = error_data.get('error', {}).get('message', str(e))
                except Exception:
                    error_message = str(e)
                    
                # Log the error with HTTP status code
                logger.error(f"API error ({status_code}): {error_message}")
                
                # Check for specific status codes
                if status_code == 404:
                    if "model" in payload:
                        raise RuntimeError(f"Model not found: {payload['model']}. Check if this model exists on your server.") from e
                    else:
                        raise RuntimeError(f"API endpoint not found: {completions_url}. Check your server URL.") from e
                elif status_code == 400:
                    raise RuntimeError(f"Bad request: {error_message}. Check your prompt or model parameters.") from e
                elif status_code == 401:
                    raise RuntimeError("Authentication failed. Check your API key if required.") from e
                elif status_code in (502, 503, 504):
                    raise RuntimeError(f"Server error ({status_code}): {error_message}. The server might be overloaded.") from e
            else:
                # For connection errors without response
                logger.error(f"Connection error: {str(e)}")
                
                if "Connection refused" in str(e):
                    raise RuntimeError(
                        f"Connection refused to {self.server_url}. "
                        "Make sure LM Studio is running and the server is started."
                    ) from e
                elif "No connection" in str(e) or "Failed to establish" in str(e):
                    raise RuntimeError(
                        f"Failed to connect to {self.server_url}. "
                        "Check if the server is running and the URL is correct."
                    ) from e
                elif "Timeout" in str(e):
                    raise RuntimeError(
                        "Request timed out. The server might be overloaded or the model is too large for your system."
                    ) from e
                
            # Generic fallback error
            raise RuntimeError(f"Failed to get response from LM Studio ({status_code or 'unknown status'}): {error_message}") from e
            
        except Exception as e:
            # For any other unexpected errors
            logger.error(f"Unexpected error: {str(e)}")
            logger.debug(traceback.format_exc())
            raise RuntimeError(f"Unexpected error when calling LM Studio: {str(e)}") from e