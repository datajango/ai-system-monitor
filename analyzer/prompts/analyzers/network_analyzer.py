"""
Network configuration analyzer
"""

from typing import Dict, List, Any, Optional, Set
import re

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


@SectionAnalyzerRegistry.register
class NetworkAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for network configuration and connection data.
    """
    
    # Common media types for network adapters
    MEDIA_TYPES = {
        "802.3": "Ethernet",
        "Native 802.11": "Wi-Fi",
        "Wireless WAN": "Mobile/Cellular",
        "Bluetooth": "Bluetooth PAN",
        "1394": "FireWire",
        "USB": "USB adapter"
    }
    
    # Common adapter status meanings
    ADAPTER_STATUS = {
        "Up": "Connected and operational",
        "Down": "Disconnected or disabled",
        "Testing": "In testing mode",
        "Unknown": "Status cannot be determined",
        "Dormant": "Not in use but ready",
        "NotPresent": "Hardware not present",
        "LowerLayerDown": "Underlying connection is down"
    }
    
    # Default DNS servers (common public DNS)
    PUBLIC_DNS_SERVERS = {
        "8.8.8.8": "Google Public DNS",
        "8.8.4.4": "Google Public DNS (Secondary)",
        "1.1.1.1": "Cloudflare DNS",
        "1.0.0.1": "Cloudflare DNS (Secondary)",
        "9.9.9.9": "Quad9 DNS",
        "149.112.112.112": "Quad9 DNS (Secondary)",
        "208.67.222.222": "OpenDNS",
        "208.67.220.220": "OpenDNS (Secondary)"
    }
    
    # Potentially concerning ports
    SENSITIVE_PORTS = {
        "20": "FTP Data",
        "21": "FTP Control",
        "22": "SSH",
        "23": "Telnet",
        "25": "SMTP",
        "53": "DNS",
        "80": "HTTP",
        "88": "Kerberos",
        "110": "POP3",
        "135": "MS RPC",
        "137": "NetBIOS Name Service",
        "138": "NetBIOS Datagram",
        "139": "NetBIOS Session",
        "143": "IMAP",
        "161": "SNMP",
        "389": "LDAP",
        "443": "HTTPS",
        "445": "SMB/CIFS",
        "514": "Syslog",
        "636": "LDAPS",
        "1433": "SQL Server",
        "1434": "SQL Server Browser",
        "3306": "MySQL",
        "3389": "RDP",
        "5900": "VNC",
        "8080": "HTTP Alternate"
    }
    
    # Private IP ranges
    PRIVATE_IP_RANGES = [
        {"pattern": r"^10\.", "description": "Class A private network (10.0.0.0/8)"},
        {"pattern": r"^172\.(1[6-9]|2[0-9]|3[0-1])\.", "description": "Class B private network (172.16.0.0/12)"},
        {"pattern": r"^192\.168\.", "description": "Class C private network (192.168.0.0/16)"},
        {"pattern": r"^127\.", "description": "Localhost (127.0.0.0/8)"},
        {"pattern": r"^169\.254\.", "description": "Link-local address (169.254.0.0/16), indicates DHCP failure"},
        {"pattern": r"^fe80:", "description": "IPv6 link-local address"},
        {"pattern": r"^::1$", "description": "IPv6 localhost"},
        {"pattern": r"^fd", "description": "IPv6 unique local address (private)"}
    ]
    
    @property
    def section_name(self) -> str:
        return "Network"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Optionally use other related data for context
        return {"RunningServices.json", "ActiveConnections.json", "FirewallRules.json"}
    
    def is_private_ip(self, ip_address: str) -> Optional[Dict[str, str]]:
        """
        Check if an IP address is within a private range.
        
        Args:
            ip_address: IP address to check
            
        Returns:
            Dict with pattern and description if private, None if public
        """
        for range_info in self.PRIVATE_IP_RANGES:
            if re.match(range_info["pattern"], ip_address):
                return range_info
        return None
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from network data.
        
        Args:
            section_data: The network section data
            
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
            private_info = self.is_private_ip(ip_address)
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
                if server in self.PUBLIC_DNS_SERVERS:
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
            if ":" in remote:
                parts = remote.split(":")
                port = parts[1]
                if port in self.SENSITIVE_PORTS:
                    sensitive_ports_active.append({
                        "port": port,
                        "service": self.SENSITIVE_PORTS[port],
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
    
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for network data analysis.
        
        Args:
            section_data: The network data
            additional_data: Optional additional data from other sections
            
        Returns:
            Formatted prompt for network data analysis
        """
        # Format the data as JSON
        import json
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Format adapter information
        adapter_info = f"Network Adapters: {metrics['adapters']['count']} total ({metrics['adapters']['up']} up, {metrics['adapters']['down']} down)"
        
        # Format adapter types
        adapter_types_str = ""
        for media_type, count in metrics['adapters']['types'].items():
            human_name = self.MEDIA_TYPES.get(media_type, media_type)
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