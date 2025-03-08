"""
Running services analyzer
"""

from typing import Dict, List, Any, Optional, Set

from prompts.base_section_analyzer import BaseSectionAnalyzer
from prompts.section_analyzers_registry import SectionAnalyzerRegistry


@SectionAnalyzerRegistry.register
class RunningServicesAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for running services data.
    """
    
    # Essential Windows services that should typically be running
    ESSENTIAL_SERVICES = [
        "wuauserv",           # Windows Update
        "WinDefend",          # Windows Defender
        "wscsvc",             # Security Center
        "LanmanServer",       # Server
        "LanmanWorkstation",  # Workstation
        "Dnscache",           # DNS Client
        "DcomLaunch",         # DCOM Server Process Launcher
        "RpcSs",              # Remote Procedure Call
        "EventLog",           # Windows Event Log
        "PlugPlay",           # Plug and Play
        "gpsvc",              # Group Policy Client
        "CryptSvc",           # Cryptographic Services
        "iphlpsvc",           # IP Helper
        "W32Time",            # Windows Time
        "SessionEnv",         # Remote Desktop Configuration
        "UserManager",        # User Manager
        "Power",              # Power
        "mpssvc",             # Windows Firewall
        "BFE",                # Base Filtering Engine
        "nvvsvc",             # NVIDIA Display Driver Service
        "spoolsv",            # Print Spooler
        "ShellHWDetection",   # Shell Hardware Detection
    ]
    
    # Services that might be unnecessary for most users
    POTENTIALLY_UNNECESSARY = [
        "AdobeARMservice",    # Adobe Acrobat Update Service
        "AdobeFlashPlayerUpdateSvc", # Adobe Flash Player Update Service
        "RemoteRegistry",     # Remote Registry
        "Fax",                # Fax
        "TapiSrv",            # Telephony
        "SCardSvr",           # Smart Card
        "BTAGService",        # Bluetooth Audio Gateway Service
        "bthserv",            # Bluetooth Support Service
        "TabletInputService", # Touch Keyboard and Handwriting
        "WbioSrvc",           # Windows Biometric Service
        "wcncsvc",            # Windows Connect Now
        "WMPNetworkSvc",      # Windows Media Player Network Sharing
        "WSearch",            # Windows Search (can be resource intensive)
        "XblAuthManager",     # Xbox Live Auth Manager
        "XblGameSave",        # Xbox Live Game Save
        "XboxNetApiSvc",      # Xbox Live Networking
        "lfsvc",              # Geolocation Service
        "DiagTrack",          # Connected User Experiences and Telemetry
        "WalletService",      # Wallet Service
        "RetailDemo",         # Retail Demo Service
        "SharedAccess",       # Internet Connection Sharing
    ]
    
    # Services that might have security implications
    SECURITY_SENSITIVE = [
        "RemoteRegistry",     # Remote Registry
        "RemoteAccess",       # Routing and Remote Access
        "TermService",        # Remote Desktop Services
        "UmRdpService",       # Remote Desktop Services UserMode Port Redirector
        "SharedAccess",       # Internet Connection Sharing
        "upnphost",           # UPnP Device Host
        "SessionEnv",         # Remote Desktop Configuration
        "NetTcpPortSharing",  # Net.Tcp Port Sharing Service
        "lmhosts",            # TCP/IP NetBIOS Helper
        "TlntSvr",            # Telnet
        "FTPSVC",             # FTP Service
        "SMTPSVC",            # Simple Mail Transfer Protocol
        "SNMP",               # Simple Network Management Protocol
        "SNMPTRAP",           # SNMP Trap
    ]
    
    # Different service start types to watch for
    START_TYPES = {
        "Automatic": "Starts when system boots",
        "AutomaticDelayedStart": "Starts shortly after boot, lower priority",
        "Manual": "Starts when needed by an application",
        "Disabled": "Cannot be started, even manually",
        "Boot": "Starts during kernel initialization",
        "System": "Starts during I/O subsystem initialization",
    }
    
    @property
    def section_name(self) -> str:
        return "RunningServices"
    
    @property
    def optional_input_files(self) -> Set[str]:
        # Optionally use other related data for context
        return {"WindowsFeatures.json", "PerformanceData.json"}
    
    def extract_key_metrics(self, section_data: Any) -> Dict[str, Any]:
        """
        Extract key metrics from running services data.
        
        Args:
            section_data: The running services section data
            
        Returns:
            Dictionary of key metrics
        """
        if not isinstance(section_data, list):
            return {"total_running_services": 0}
        
        # Count total running services
        total_services = len(section_data)
        
        # Count by start type
        start_types = {}
        for service in section_data:
            start_type = service.get("StartType", "Unknown")
            start_types[start_type] = start_types.get(start_type, 0) + 1
        
        # Count essential services
        essential_services_running = 0
        essential_services_missing = []
        for essential in self.ESSENTIAL_SERVICES:
            found = False
            for service in section_data:
                if service.get("Name") == essential:
                    essential_services_running += 1
                    found = True
                    break
            if not found:
                essential_services_missing.append(essential)
        
        # Count potentially unnecessary services
        unnecessary_running = 0
        unnecessary_services = []
        for service in section_data:
            if service.get("Name") in self.POTENTIALLY_UNNECESSARY:
                unnecessary_running += 1
                unnecessary_services.append(service.get("Name"))
        
        # Count security-sensitive services
        security_sensitive_running = 0
        security_sensitive_services = []
        for service in section_data:
            if service.get("Name") in self.SECURITY_SENSITIVE:
                security_sensitive_running += 1
                security_sensitive_services.append(service.get("Name"))
        
        return {
            "total_running_services": total_services,
            "start_types": start_types,
            "essential_services": {
                "running": essential_services_running,
                "total_essential": len(self.ESSENTIAL_SERVICES),
                "missing": essential_services_missing
            },
            "unnecessary_services": {
                "running": unnecessary_running,
                "services": unnecessary_services
            },
            "security_sensitive": {
                "running": security_sensitive_running,
                "services": security_sensitive_services
            }
        }
    
    def create_prompt(self, section_data: Any, additional_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for running services analysis.
        
        Args:
            section_data: The running services section data
            additional_data: Optional additional data from other sections
            
        Returns:
            Formatted prompt for running services analysis
        """
        # Format the data as JSON
        import json
        section_json = json.dumps(section_data, ensure_ascii=False)
        
        # Truncate very large sections to avoid hitting token limits
        if len(section_json) > 10000:
            section_json = section_json[:10000] + "... [truncated for length]"
        
        # Extract key metrics for enhanced prompting
        metrics = self.extract_key_metrics(section_data)
        
        # Format start types for display
        start_types_str = "\n".join([f"  - {start_type}: {count}" for start_type, count in metrics["start_types"].items()])
        
        # Format missing essential services
        missing_essentials = metrics["essential_services"]["missing"]
        missing_essentials_str = ""
        if missing_essentials:
            missing_list = "\n".join([f"  - {service}" for service in missing_essentials])
            missing_essentials_str = f"\nPotentially concerning missing essential services:\n{missing_list}"
        
        # Format unnecessary running services
        unnecessary_str = ""
        if metrics["unnecessary_services"]["running"] > 0:
            unnecessary_list = "\n".join([f"  - {service}" for service in metrics["unnecessary_services"]["services"][:10]])
            if len(metrics["unnecessary_services"]["services"]) > 10:
                unnecessary_list += "\n  - ... and others"
            unnecessary_str = f"\nPotentially unnecessary services running:\n{unnecessary_list}"
        
        # Format security-sensitive running services
        security_str = ""
        if metrics["security_sensitive"]["running"] > 0:
            security_list = "\n".join([f"  - {service}" for service in metrics["security_sensitive"]["services"]])
            security_str = f"\nSecurity-sensitive services running:\n{security_list}"
        
        # Add performance context if available
        performance_context = ""
        if additional_data and "PerformanceData" in additional_data:
            perf_data = additional_data["PerformanceData"]
            cpu_usage = None
            memory_usage = None
            
            if isinstance(perf_data, dict):
                cpu_usage = perf_data.get("ProcessorUsage")
                if isinstance(perf_data.get("Memory"), dict):
                    memory_usage = perf_data.get("Memory", {}).get("PercentUsed")
            
            if cpu_usage is not None or memory_usage is not None:
                performance_context = f"\nCurrent system performance:"
                if cpu_usage is not None:
                    performance_context += f"\n- CPU Usage: {cpu_usage}%"
                if memory_usage is not None:
                    performance_context += f"\n- Memory Usage: {memory_usage}%"
        
        # Build specific analysis instructions
        prompt = f"""
Analyze the running Windows services to identify potential issues, security risks, and optimization opportunities:

1. Service status assessment
   - Identify services that should be running but aren't
   - Assess if the right set of services is running for this system's purpose
   - Check for unnecessary or redundant services that could be disabled

2. Security implications
   - Look for services that might introduce security vulnerabilities
   - Identify services that should be running in different security contexts
   - Check for services that should be disabled unless specifically needed
   - Assess services with network exposure

3. Performance impact
   - Identify resource-intensive services that might impact system performance
   - Look for services that could be reconfigured to start manually rather than automatically
   - Check for services that might conflict with each other

4. Configuration recommendations
   - Suggest optimizations for service configurations
   - Identify services that could be disabled safely
   - Recommend alternative start types for services

Key metrics:
- Total running services: {metrics['total_running_services']}
- Services by start type:
{start_types_str}
- Essential services running: {metrics['essential_services']['running']} out of {metrics['essential_services']['total_essential']}{missing_essentials_str}{unnecessary_str}{security_str}{performance_context}

The running services data for analysis:
```json
{section_json}
```
"""
        return prompt