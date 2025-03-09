"""
Network analyzer utility functions
"""

import re
import logging
from typing import Dict, List, Any, Optional, Callable

from prompts.analyzers.network.network_constants import (
    MEDIA_TYPES, ADAPTER_STATUS, PUBLIC_DNS_SERVERS, 
    SENSITIVE_PORTS, PRIVATE_IP_RANGES
)

logger = logging.getLogger(__name__)

def is_private_ip(ip_address: str) -> Optional[Dict[str, str]]:
    """
    Check if an IP address is within a private range.
    
    Args:
        ip_address: IP address to check
        
    Returns:
        Dict with pattern and description if private, None if public
    """
    for range_info in PRIVATE_IP_RANGES:
        if re.match(range_info["pattern"], ip_address):
            return range_info
    return None

def extract_key_metrics(section_data: Any, is_private_ip_func: Callable) -> Dict[str, Any]:
    """
    Extract key metrics from network data.
    
    Args:
        section_data: The network section data
        is_private_ip_func: Function to check if an IP is private
        
    Returns:
        Dictionary of key metrics
    """
    if not isinstance(section_data, dict):
        return {"error": "Invalid network data format"}
    
    # Extract adapter information
    adapters = section_data.get("Adapters", [])
    if not isinstance(adapters, list):
        adapters = []
    
    # Count adapters by status and type
    adapter_count = len(adapters)
    adapters_up = sum(1 for adapter in adapters if adapter.get("Status") == "Up")
    adapters_down = sum(1 for adapter in adapters if adapter.get("Status") == "Down")
    
    adapter_types = {}
    for adapter in adapters:
        media_type = adapter.get("MediaType", "Unknown")
        adapter_types[media_type] = adapter_types.get(media_type, 0) + 1
    
    # Extract IP configuration
    ip_config = section_data.get("IPConfiguration", [])
    if not isinstance(ip_config, list):
        ip_config = []
    
    # Count adapters with DHCP vs static IPs
    dhcp_count = 0
    static_count = 0
    public_ip_count = 0
    
    for config in ip_config:
        ip_address = config.get("IPv4Address", "")
        
        # Skip if no IP address
        if not ip_address:
            continue
            
        # Check if private or public
        private_info = is_private_ip_func(ip_address)
        if not private_info:
            public_ip_count += 1
        
        # Check if potentially DHCP or static
        # This is a heuristic as we don't have direct DHCP info
        if ip_address.startswith("169.254."):
            # APIPA address - DHCP failure
            dhcp_count += 1
        elif private_info and private_info["pattern"] == r"^10\.":
            # Class A private are often manually configured
            static_count += 1
        elif private_info and private_info["pattern"] == r"^192\.168\.":
            # Class C private are often DHCP
            dhcp_count += 1
    
    # Extract DNS settings
    dns_settings = section_data.get("DNSSettings", [])
    if not isinstance(dns_settings, list):
        dns_settings = []
    
    # Check for public DNS usage
    using_public_dns = False
    for dns in dns_settings:
        server_addresses = dns.get("ServerAddresses", [])
        for server in server_addresses:
            if server in PUBLIC_DNS_SERVERS:
                using_public_dns = True
                break
        if using_public_dns:
            break
    
    # Check active connections (if available)
    active_connections = section_data.get("ActiveConnections", [])
    if not isinstance(active_connections, list):
        active_connections = []
    
    connections_count = len(active_connections)
    
    # Check for potentially sensitive ports
    sensitive_ports_active = []
    for conn in active_connections:
        remote = conn.get("RemoteAddress", "")
        if isinstance(remote, str) and ":" in remote:
            parts = remote.split(":")
            if len(parts) > 1:
                port = parts[-1]  # Get the last part as port
                if port in SENSITIVE_PORTS:
                    sensitive_ports_active.append({
                        "port": port,
                        "service": SENSITIVE_PORTS[port],
                        "remote": remote
                    })
    
    return {
        "adapters": {
            "count": adapter_count,
            "up": adapters_up,
            "down": adapters_down,
            "types": adapter_types
        },
        "ip_configuration": {
            "estimated_dhcp": dhcp_count,
            "estimated_static": static_count,
            "public_ips": public_ip_count
        },
        "dns": {
            "using_public_dns": using_public_dns
        },
        "connections": {
            "count": connections_count,
            "sensitive_ports": sensitive_ports_active
        }
    }