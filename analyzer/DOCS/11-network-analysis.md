# Network Analyzer Component

## Overview

The Network Analyzer is one of the most sophisticated components of the System State Analyzer, providing comprehensive analysis of the system's network configuration, interfaces, connections, and DNS settings. This component examines data collected from the `Network.json` file produced by the System State Collector, offering detailed insights into connectivity, security posture, and potential networking issues.

## Input Data Source

**Filename**: `Network.json`

According to the documentation in `11-network.md`, the Network collector gathers information about:
- Network adapters and their properties
- IP addressing and configuration
- Active network connections
- DNS client settings
- Network-related hardware details
- Connection speeds and media types

The collection is performed by the `NetworkCollector.ps1` script, which leverages PowerShell's networking cmdlets to gather this information.

## Analyzer Implementation

The Network analyzer is implemented through a set of dedicated files:

1. `network_analyzer.py` - The main analyzer class
2. `network_utils.py` - Utility functions for network data processing
3. `network_constants.py` - Constants and reference data
4. `network_prompt_factory.py` - Functions to create specialized prompts

The main analyzer class is registered with the registry:

```python
@SectionAnalyzerRegistry.register
class NetworkAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for network configuration and connection data.
    """
    
    # Enable chunking for this analyzer
    USES_CHUNKING = True
    
    # Override the max JSON length for this analyzer specifically
    MAX_JSON_LENGTH = 3000
    
    @property
    def section_name(self) -> str:
        return "Network"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Optionally use other related data for context
        return {"RunningServices.json", "ActiveConnections.json", "FirewallRules.json"}
```

Notable features of this implementation:
1. It enables chunking (`USES_CHUNKING = True`) to handle large datasets
2. It sets a custom maximum JSON length (3000 characters) for truncation
3. It optionally incorporates additional context from related data sources

## Network Constants

The `network_constants.py` file defines several important reference dictionaries:

```python
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
    # ... [additional port definitions] ...
}

# Private IP ranges
PRIVATE_IP_RANGES = [
    {"pattern": r"^10\.", "description": "Class A private network (10.0.0.0/8)"},
    {"pattern": r"^172\.(1[6-9]|2[0-9]|3[0-1])\.", "description": "Class B private network (172.16.0.0/12)"},
    # ... [additional IP range definitions] ...
]
```

These constants enable the analyzer to interpret raw network data and identify potential security concerns.

## Network Utilities

The `network_utils.py` file provides specialized functions for network data analysis:

```python
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
    # ... [implementation details] ...
    
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
```

The `extract_key_metrics` function processes raw network data to generate meaningful metrics about:
- Adapter counts and states
- IP addressing methods (DHCP vs. static)
- Public vs. private IP usage
- DNS server configurations
- Active connections and sensitive ports

## Prompt Generation

The `network_prompt_factory.py` file contains specialized functions for generating prompts:

```python
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
    
    # ... [additional formatting] ...
    
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
```

Additionally, it provides specialized component-specific prompt generation:

```python
def create_component_prompt(component_name: str, component_data: Any) -> str:
    """
    Create a prompt for a specific network component.
    
    Args:
        component_name: Name of the component
        component_data: Data for this component
        
    Returns:
        Formatted prompt
    """
    # ... [implementation details] ...
    
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
        # ... [other component instructions] ...
    }
```

This approach allows for specialized analysis of different network components.

## Chunking Analysis Method

The Network analyzer implements a sophisticated chunking strategy through the `analyze_with_chunking` method:

```python
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
        prompt = create_component_prompt(component_name, component_data)
        
        # ... [LLM interaction and processing] ...
        
        # Collect issues and optimizations
        if "issues" in component_analysis:
            # Tag issues with the component they came from
            for issue in component_analysis["issues"]:
                issue["component"] = component_name
            all_issues.extend(component_analysis["issues"])
        
        # ... [similar processing for optimizations and summaries] ...
    
    # Create aggregated analysis
    aggregated_analysis = {
        "issues": all_issues,
        "optimizations": all_optimizations,
    }
    
    # Generate an overall summary from component summaries
    if component_summaries:
        metrics = self.extract_key_metrics(section_data)
        overall_summary_prompt = create_overall_summary_prompt(component_summaries, metrics)
        
        # ... [summary generation logic] ...
        
    else:
        aggregated_analysis["summary"] = "No analysis could be generated for any network components."
    
    return aggregated_analysis
```

This implementation:
1. Divides the network data into logical components (adapters, IP configuration, DNS, connections)
2. Analyzes each component separately
3. Tags issues and optimizations with their component source
4. Aggregates all component analyses
5. Generates an overall summary based on all component analyses

## Output Structure

The output of the Network analyzer is stored in `NetworkAnalysis.json`. Based on the chunking implementation, the output structure is:

```json
{
  "issues": [
    {
      "severity": "high|medium|low",
      "component": "adapters|ip_config|dns|connections",
      "title": "Description of the issue",
      "description": "Detailed explanation of the problem",
      "recommendation": "Suggested action to resolve the issue"
    }
  ],
  "optimizations": [
    {
      "impact": "high|medium|low",
      "component": "adapters|ip_config|dns|connections",
      "title": "Optimization opportunity",
      "description": "Explanation of the optimization",
      "recommendation": "Steps to implement the optimization"
    }
  ],
  "summary": "Overall assessment of network configuration"
}
```

Additionally, since this analyzer uses chunking, the LLM interactions are split into multiple files:
- `Network_adapters_llm_interaction.json`
- `Network_ip_config_llm_interaction.json`
- `Network_dns_llm_interaction.json`
- `Network_connections_llm_interaction.json`
- `Network_summary_llm_interaction.json`

## Data Structure

According to the documentation, the Network data structure includes:

```json
{
  "Timestamp": "2025-03-10T15:30:45.0000000Z",
  "ComputerName": "HOSTNAME",
  "Data": {
    "Adapters": [
      {
        "Name": "Ethernet",
        "Description": "Intel(R) Ethernet Connection I219-V",
        "Status": "Up",
        "MacAddress": "00-11-22-33-44-55",
        "LinkSpeed": "1 Gbps",
        "MediaType": "802.3"
      },
      {
        "Name": "Wi-Fi",
        "Description": "Intel(R) Wireless-AC 9560",
        "Status": "Up",
        "MacAddress": "AA-BB-CC-DD-EE-FF",
        "LinkSpeed": "866.7 Mbps",
        "MediaType": "Native 802.11"
      }
    ],
    "IPConfiguration": [
      {
        "InterfaceAlias": "Ethernet",
        "IPv4Address": "192.168.1.100",
        "IPv4Gateway": "192.168.1.1",
        "DNSServers": [
          "192.168.1.1",
          "8.8.8.8"
        ]
      }
    ],
    "ActiveConnections": [
      {
        "LocalAddress": "192.168.1.100:52634",
        "RemoteAddress": "13.107.18.11:443",
        "State": "Established",
        "Process": "msedge",
        "PID": 4256
      }
    ],
    "DNSSettings": [
      {
        "InterfaceAlias": "Ethernet",
        "InterfaceIndex": 4,
        "ServerAddresses": [
          "192.168.1.1",
          "8.8.8.8"
        ]
      }
    ]
  }
}
```

## Key Analysis Areas

Based on the prompt structure and component breakdown, the analyzer focuses on:

1. **Network Adapters**:
   - Status assessment (Up, Down, etc.)
   - Media type and link speed evaluation
   - Hardware identification
   - Configuration issues

2. **IP Configuration**:
   - IP address allocation (DHCP vs. static)
   - Public vs. private IP analysis
   - Gateway configuration
   - Subnet assessment

3. **DNS Settings**:
   - DNS server security (public vs. private)
   - DNS configuration correctness
   - Name resolution reliability
   - DNS security implications

4. **Network Connections**:
   - Active connection assessment
   - Security implications of connections
   - Process-to-connection correlation
   - Sensitive port detection

## Security Analysis

The Network analyzer performs sophisticated security analysis:

1. **Private IP Detection**: Uses regex patterns to identify private IPs
2. **Sensitive Port Monitoring**: Checks for potentially risky open ports
3. **Public DNS Usage**: Identifies when public DNS servers are in use
4. **Network Exposure**: Assesses potential exposure points in the network configuration

## Performance Analysis

The analyzer also evaluates network performance aspects:

1. **Adapter Speed**: Examines link speeds and potential limitations
2. **Network Bottlenecks**: Identifies potential performance bottlenecks
3. **Configuration Optimization**: Suggests improvements for better performance
4. **Interface Priority**: Assesses adapter ordering and routing implications

## Correlation with Other Analyzers

The Network analyzer complements and correlates with:

- **RunningServices**: Provides context about services that may be utilizing network connections
- **RegistrySettings**: Contains network-related registry configurations
- **PerformanceData**: System performance can be affected by network activity
- **Browsers**: Web browsers often establish multiple network connections
- **WindowsFeatures**: Network-related Windows features may affect available interfaces and services

## LLM Interaction Flow

Due to the chunking implementation, the LLM interaction flow is complex:

1. The analyzer loads the `Network.json` data
2. It divides the data into components (adapters, IP configuration, DNS, connections)
3. For each non-empty component:
   a. It creates a component-specific prompt
   b. It sends the prompt to the LLM
   c. It processes the response and tags issues/optimizations with the component
4. It aggregates all component analyses
5. It creates a final summary prompt with all component summaries
6. It sends the summary prompt to the LLM
7. It adds the summary to the aggregated analysis
8. The final result is saved as `NetworkAnalysis.json`
9. All LLM interactions are saved in component-specific log files

## Current Limitations

- Point-in-time view without historical network activity
- Limited IPv6 focus compared to IPv4
- Emphasis on TCP connections rather than UDP
- No traffic analysis or bandwidth utilization
- No wireless network signal strength or quality assessment

## Improvement Opportunities

Based on the documentation in `11-network.md`, potential improvements include:

1. Expanding IPv6 support with detailed addressing and configuration
2. Adding wireless network details (SSID, signal strength, security type)
3. Implementing VPN identification for connections
4. Including UDP endpoint information
5. Adding interface-level statistics (bytes sent/received, errors)
6. Including DNS resolver cache contents
7. Adding Windows Firewall rule integration
