"""
Network analyzer prompt generation
"""

import json
import logging
from typing import Dict, List, Any, Optional, Callable

from prompts.analyzers.network.network_constants import MEDIA_TYPES

logger = logging.getLogger(__name__)

def create_prompt(section_data: Any, additional_data: Optional[Dict[str, Any]], extract_key_metrics_func: Callable) -> str:
    """
    Create a prompt for network data analysis.
    
    Args:
        section_data: The network data
        additional_data: Optional additional data from other sections
        extract_key_metrics_func: Function to extract key metrics
        
    Returns:
        Formatted prompt for network data analysis
    """
    # Format the data as JSON
    section_json = json.dumps(section_data, ensure_ascii=False)
    
    # Truncate very large sections to avoid hitting token limits
    if len(section_json) > 8000:
        section_json = section_json[:8000] + "... [truncated for length]"
    
    # Extract key metrics for enhanced prompting
    metrics = extract_key_metrics_func(section_data)
    
    # Format adapter information
    adapter_info = f"Network Adapters: {metrics['adapters']['count']} total ({metrics['adapters']['up']} up, {metrics['adapters']['down']} down)"
    
    # Format adapter types
    adapter_types_str = ""
    for media_type, count in metrics['adapters']['types'].items():
        human_name = MEDIA_TYPES.get(media_type, media_type)
        adapter_types_str += f"\n  - {human_name}: {count}"
    
    # Format IP configuration
    ip_config = f"IP Configuration:"
    ip_config += f"\n  - DHCP (estimated): {metrics['ip_configuration']['estimated_dhcp']}"
    ip_config += f"\n  - Static (estimated): {metrics['ip_configuration']['estimated_static']}"
    ip_config += f"\n  - Public IP addresses: {metrics['ip_configuration']['public_ips']}"
    
    # Format DNS information
    dns_info = "DNS Configuration:"
    dns_info += f"\n  - Using public DNS: {'Yes' if metrics['dns']['using_public_dns'] else 'No - Using ISP or custom DNS'}"
    
    # Format connections information
    connections_info = f"Active Connections: {metrics['connections']['count']}"
    
    # Format sensitive ports
    sensitive_ports_str = ""
    if metrics['connections']['sensitive_ports']:
        sensitive_ports_str = "\nSensitive Ports Active:"
        for port_info in metrics['connections']['sensitive_ports']:
            sensitive_ports_str += f"\n  - {port_info['port']} ({port_info['service']}): {port_info['remote']}"
    
    # Build specific analysis instructions
    prompt = f"""
Analyze the network configuration data to identify potential issues, security risks, and optimization opportunities:

1. Network connectivity assessment
   - Evaluate adapter status and configuration
   - Assess IPv4 and IPv6 configuration correctness
   - Check for misconfigurations in networking settings
   - Identify potential connectivity issues

2. Security evaluation
   - Identify potential security risks in network configuration
   - Assess DNS server security implications
   - Evaluate network exposure based on adapter configuration
   - Check for concerning active connections or listening ports
   - Identify any unusual or potentially malicious network activity

3. Performance optimization
   - Evaluate network adapter performance settings
   - Assess if network configuration is optimal for the system's purpose
   - Identify potential bottlenecks in network configuration
   - Suggest improvements for network performance

4. Configuration recommendations
   - Recommend best practices for network security
   - Suggest improvements to network reliability
   - Identify areas where network configuration could be optimized
   - Provide guidance on DNS configuration

Key metrics:
- {adapter_info}{adapter_types_str}
- {ip_config}
- {dns_info}
- {connections_info}{sensitive_ports_str}

The network data for analysis:
```json
{section_json}
```
"""
    return prompt

def create_component_prompt(component_name: str, component_data: Any) -> str:
    """
    Create a prompt for a specific network component.
    
    Args:
        component_name: Name of the component
        component_data: Data for this component
        
    Returns:
        Formatted prompt
    """
    # For arrays, take a small representative sample
    if isinstance(component_data, list) and len(component_data) > 5:
        # Take just a few items - first 2, last 1, and 2 from the middle if possible
        sample_data = []
        
        # Add first 2 items
        sample_data.extend(component_data[:2])
        
        # Add up to 2 items from the middle
        if len(component_data) > 4:
            middle_start = len(component_data) // 2 - 1
            middle_items = component_data[middle_start:middle_start+2]
            sample_data.extend(middle_items)
        
        # Add last item
        if len(component_data) > 2:
            sample_data.append(component_data[-1])
            
        # Replace the full data with the sample
        component_data = sample_data
        
        logger.info(f"Reduced {component_name} component from {len(component_data)} items to {len(sample_data)} representative items")
    
    # Format the data as JSON
    try:
        component_json = json.dumps(component_data, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error converting {component_name} component to JSON: {str(e)}")
        component_json = json.dumps({"error": f"Could not convert to JSON: {str(e)}"})
    
    # Strictly enforce a much lower character limit to prevent bad requests
    if len(component_json) > 1000:  # Much stricter limit
        component_json = component_json[:1000] + "... [truncated for length]"
    
    # Component-specific instructions
    instruction_texts = {
        "adapters": """
Analyze network adapters, focusing on:
1. Adapter status (Up/Down)
2. Adapter types and configurations
3. Potential issues or misconfigurations
""",
        "ip_config": """
Analyze IP configuration, focusing on:
1. IP address allocation (DHCP vs static)
2. Subnet configuration
3. Potential IP addressing issues
""",
        "dns": """
Analyze DNS settings, focusing on:
1. DNS server configuration
2. Security and reliability of DNS settings
3. Potential DNS-related issues
""",
        "connections": """
Analyze network connections, focusing on:
1. Active connection patterns
2. Security implications of connections
3. Suspicious or potentially problematic connections
"""
    }
    
    # Get the instruction for this component or use a default
    instruction_text = instruction_texts.get(component_name, "Analyze this network component.")
    
    # Simplified template for reference (not used directly in the prompt)
    template_example = {
        "issues": [{"severity": "high", "title": "Example issue", "recommendation": "Example action"}],
        "optimizations": [{"impact": "medium", "title": "Example optimization", "recommendation": "Example action"}],
        "summary": "Brief assessment"
    }
    
    prompt = f"""
Analyze this {component_name} component of a Windows network configuration.

{instruction_text}

{component_name} data (sample):
```json
{component_json}
```

Provide JSON analysis with issues, optimizations, and summary.
"""
    return prompt

def create_overall_summary_prompt(component_summaries: List[str], metrics: Dict[str, Any]) -> str:
    """
    Create a prompt to generate an overall summary from individual component summaries.
    
    Args:
        component_summaries: List of summaries from individual components
        metrics: Extracted key metrics
        
    Returns:
        Formatted prompt
    """
    # Join the summaries
    all_summaries = "\n".join(component_summaries)
    
    # Format adapter information
    adapter_info = f"Network Adapters: {metrics['adapters']['count']} total ({metrics['adapters']['up']} up, {metrics['adapters']['down']} down)"
    
    # Format connections information
    connections_info = f"Active Connections: {metrics['connections']['count']}"
    
    prompt = f"""
Create a concise summary for the Network section based on these component analyses:

Metrics:
- {adapter_info}
- {connections_info}

Component summaries:
{all_summaries}

Provide JSON with just a "summary" field containing your network assessment.
"""
    return prompt