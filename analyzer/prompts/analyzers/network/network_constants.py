"""
Network analyzer constants
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