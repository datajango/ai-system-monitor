"""
Network configuration analyzer
"""

from typing import Dict, List, Any, Optional, Set
import re
import json
import logging
from datetime import datetime
from pathlib import Path

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry
from utils.json_helper import extract_json_from_response

logger = logging.getLogger(__name__)


@SectionAnalyzerRegistry.register
class NetworkAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for network configuration and connection data.
    """
    
    # Enable chunking for this analyzer
    USES_CHUNKING = True
    
    # Override the max JSON length for this analyzer specifically
    MAX_JSON_LENGTH = 3000
    
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
        if len(section_json) > 8000:
            section_json = section_json[:8000] + "... [truncated for length]"
        
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
        
    def analyze_with_chunking(self, lm_client, section_data: Any, additional_data: Optional[Dict[str, Any]] = None, llm_log_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze network configuration by breaking it into separate components.
        
        Args:
            lm_client: LLM client for making API calls
            section_data: The full network data
            additional_data: Optional additional data from other sections
            llm_log_dir: Directory to save LLM interaction logs, or None to skip
            
        Returns:
            Aggregated analysis results
        """
        if not isinstance(section_data, dict):
            return {"error": "Invalid network data format"}
        
        # Initialize aggregated results
        all_issues = []
        all_optimizations = []
        component_summaries = []
        
        # Define network components to analyze separately
        components = {
            "adapters": section_data.get("Adapters", []),
            "ip_config": section_data.get("IPConfiguration", []),
            "dns": section_data.get("DNSSettings", []),
            "connections": section_data.get("ActiveConnections", [])
        }
        
        # Process each component
        for component_name, component_data in components.items():
            logger.info(f"Analyzing network component: {component_name}")
            
            # Skip empty components
            if not component_data:
                logger.warning(f"Network component '{component_name}' is empty, skipping")
                continue
            
            # Create prompt for this component
            prompt = self._create_component_prompt(component_name, component_data)
            
            # Initialize LLM log if needed
            llm_log = None
            if llm_log_dir:
                llm_log = {
                    "timestamp": datetime.now().isoformat(),
                    "section": f"Network_{component_name}",
                    "prompt": prompt
                }
            
            # Call the LLM
            try:
                response = lm_client.generate(prompt)
                
                # Update log if needed
                if llm_log:
                    llm_log["response"] = response
                    llm_log["status"] = "success"
                    
                # Extract JSON from response
                component_analysis = extract_json_from_response(response)
                
                # Collect issues and optimizations
                if "issues" in component_analysis:
                    # Tag issues with the component they came from
                    for issue in component_analysis["issues"]:
                        issue["component"] = component_name
                    all_issues.extend(component_analysis["issues"])
                
                if "optimizations" in component_analysis:
                    # Tag optimizations with the component they came from
                    for opt in component_analysis["optimizations"]:
                        opt["component"] = component_name
                    all_optimizations.extend(component_analysis["optimizations"])
                
                if "summary" in component_analysis:
                    component_summaries.append(f"{component_name.upper()}: {component_analysis['summary']}")
                
            except Exception as e:
                # Log the error
                logger.error(f"Error analyzing network component {component_name}: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                
                # Update log if needed
                if llm_log:
                    llm_log["error"] = str(e)
                    llm_log["traceback"] = traceback.format_exc()
                    llm_log["status"] = "error"
                
                component_summaries.append(f"Error analyzing {component_name}: {str(e)}")
            finally:
                # Save the log if needed
                if llm_log and llm_log_dir:
                    log_file = Path(llm_log_dir) / f"Network_{component_name}_llm_interaction.json"
                    with open(log_file, "w", encoding="utf-8") as f:
                        json.dump(llm_log, f, indent=2, ensure_ascii=False)
                    logger.debug(f"Saved LLM interaction log to {log_file}")
        
        # Create aggregated analysis
        aggregated_analysis = {
            "issues": all_issues,
            "optimizations": all_optimizations,
        }
        
        # Generate an overall summary from component summaries
        if component_summaries:
            metrics = self.extract_key_metrics(section_data)
            overall_summary_prompt = self._create_overall_summary_prompt(component_summaries, metrics)
            
            # Initialize LLM log if needed
            summary_llm_log = None
            if llm_log_dir:
                summary_llm_log = {
                    "timestamp": datetime.now().isoformat(),
                    "section": "Network_summary",
                    "prompt": overall_summary_prompt
                }
            
            try:
                response = lm_client.generate(overall_summary_prompt)
                
                # Update log if needed
                if summary_llm_log:
                    summary_llm_log["response"] = response
                    summary_llm_log["status"] = "success"
                    
                summary_analysis = extract_json_from_response(response)
                
                if "summary" in summary_analysis:
                    aggregated_analysis["summary"] = summary_analysis["summary"]
                else:
                    # Fallback: Join component summaries
                    aggregated_analysis["summary"] = "\n".join(component_summaries)
            except Exception as e:
                logger.error(f"Error generating overall summary for network analysis: {str(e)}")
                import traceback
                logger.debug(traceback.format_exc())
                
                # Update log if needed
                if summary_llm_log:
                    summary_llm_log["error"] = str(e)
                    summary_llm_log["traceback"] = traceback.format_exc()
                    summary_llm_log["status"] = "error"
                    
                # Fallback: Join component summaries
                aggregated_analysis["summary"] = "\n".join(component_summaries)
            finally:
                # Save the log if needed
                if summary_llm_log and llm_log_dir:
                    log_file = Path(llm_log_dir) / "Network_summary_llm_interaction.json"
                    with open(log_file, "w", encoding="utf-8") as f:
                        json.dump(summary_llm_log, f, indent=2, ensure_ascii=False)
                    logger.debug(f"Saved LLM interaction log to {log_file}")
        else:
            aggregated_analysis["summary"] = "No analysis could be generated for any network components."
        
        return aggregated_analysis
    
    def _create_component_prompt(self, component_name: str, component_data: Any) -> str:
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
        instructions = {
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
        
        # Simplified template to reduce token usage
        template = {
            "issues": [{"severity": "high", "title": "Example issue", "recommendation": "Example action"}],
            "optimizations": [{"impact": "medium", "title": "Example optimization", "recommendation": "Example action"}],
            "summary": "Brief assessment"
        }
        
        prompt = f"""
    Analyze this {component_name} component of a Windows network configuration.

    {instructions.get(component_name, "Analyze this network component.")}

    {component_name} data (sample):
    ```json
    {component_json}
    ```

    Provide JSON analysis with issues, optimizations, and summary.
    """
        return prompt

    def _create_overall_summary_prompt(self, component_summaries: List[str], metrics: Dict[str, Any]) -> str:
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

