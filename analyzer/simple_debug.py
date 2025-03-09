# simple_debug.py
"""
Simple script to debug .env loading
"""
import os
from pathlib import Path
from dotenv import load_dotenv

def main():
    # Print starting message
    print("Simple .env debug script starting...")
    
    # Check if .env exists in current directory
    env_path = Path('.env')
    print(f"Looking for .env at: {env_path.absolute()}")
    
    if env_path.exists():
        print(f".env file found!")
        
        # Print file content
        with open(env_path, 'r') as f:
            content = f.read()
            print(f"Content of .env file:\n{content}")
        
        # Try to load .env
        print("Attempting to load .env with load_dotenv...")
        loaded = load_dotenv(env_path)
        print(f"Load result: {loaded}")
        
        # Print LLM_SERVER_URL from environment
        server_url = os.environ.get('LLM_SERVER_URL', 'Not found in environment')
        print(f"LLM_SERVER_URL from environment: {server_url}")
        
        # Try to directly access your server
        print(f"\nAttempting to make a direct request to your server...")
        try:
            import requests
            # Create URL for the models endpoint
            models_url = f"{server_url.rstrip('/')}/models"
            print(f"Request URL: {models_url}")
            
            response = requests.get(models_url, timeout=5)
            print(f"Response status: {response.status_code}")
            print(f"Response content (first 500 chars): {response.text[:500]}")
        except Exception as e:
            print(f"Error making request: {e}")
    else:
        print(f".env file not found at: {env_path.absolute()}")

if __name__ == "__main__":
    main()