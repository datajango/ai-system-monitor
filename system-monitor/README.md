# System State Monitor

A PowerShell-based tool for monitoring and tracking changes to your Windows system state over time.

## Features

- Collects detailed system information:
  - PATH environment variable (with validity checks)
  - Installed programs and Windows features
  - Startup programs and scheduled tasks
  - Running services
  - Disk space usage
  - Processor and memory usage
  - Network configurations and active connections
  - Installed fonts
  - Environment variables
  - Important registry settings
  - Windows update history
  - Device drivers
  - Python installations and virtual environments
  - Installed browsers and their extensions/add-ons
- Saves snapshots as JSON files with timestamps
- Compares snapshots to show what's changed

## Directory Structure

```
SystemMonitor/
├── SystemMonitor.ps1          # Main script
├── README.md                  # This documentation
├── Collectors/                # Data collection modules
│   ├── PathCollector.ps1        # PATH variable collection
│   ├── ProgramCollector.ps1     # Installed programs collection
│   ├── StartupCollector.ps1     # Startup programs collection
│   ├── ServiceCollector.ps1     # Running services collection
│   ├── DiskCollector.ps1        # Disk space collection
│   ├── PerformanceCollector.ps1 # CPU and memory collection
│   ├── NetworkCollector.ps1     # Network adapters and configurations
│   ├── FontCollector.ps1        # Installed fonts
│   ├── EnvironmentCollector.ps1 # Environment variables
│   ├── TaskCollector.ps1        # Scheduled tasks
│   ├── FeaturesCollector.ps1    # Windows features
│   ├── RegistryCollector.ps1    # Important registry settings
│   ├── UpdatesCollector.ps1     # Windows updates
│   ├── DriversCollector.ps1     # Device drivers
│   ├── PythonCollector.ps1      # Python installations and environments
│   └── BrowserCollector.ps1     # Browsers and extensions
└── Utils/                     # Utility functions
    ├── SummaryUtil.ps1        # Summary generation functions
    └── ComparisonUtil.ps1     # Comparison functions
```

## Usage

### Taking a System Snapshot

```powershell
# Basic usage - saves snapshot to the script directory
.\SystemMonitor.ps1

# Save to a specific directory
.\SystemMonitor.ps1 -OutputPath "C:\Snapshots"

# Take a snapshot and compare with the most recent previous snapshot
.\SystemMonitor.ps1 -CompareWithLatest
```

### Comparing Snapshots

```powershell
# First, dot-source the script to load the comparison function
. .\SystemMonitor.ps1

# Compare two snapshots (all available common sections)
Compare-SystemStates -BaselinePath "SystemState_2025-03-08_10-00-00" -CurrentPath "SystemState_2025-03-08_12-00-00"

# Compare only specific sections
Compare-SystemStates -BaselinePath "SystemState_2025-03-08_10-00-00" -CurrentPath "SystemState_2025-03-08_12-00-00" -Sections "Path","InstalledPrograms","Network","PythonInstallations"
```

### Output Structure

Each snapshot is saved in its own directory with the following structure:

```
SystemState_2025-03-08_10-00-00/
├── metadata.json             # Basic system info and timestamp
├── index.json                # List of all collected data files
├── summary.txt               # Human-readable summary of the snapshot
├── Path.json                 # PATH environment variable data
├── InstalledPrograms.json    # Installed software data
├── StartupPrograms.json      # Startup items data
├── ...                       # Other collected data files
```

This organized structure makes it easier to:

1. Manage large datasets by separating them into individual files
2. Compare specific aspects of your system independently
3. Add new collectors without affecting the existing structure

## Installation

1. Download or clone this repository
2. Ensure all files maintain their relative directory structure
3. Run from PowerShell with appropriate execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

## Requirements

- Windows PowerShell 5.1 or PowerShell Core 6.0+
- Windows operating system

## Use Cases

- Track system changes before and after software installations
- Monitor system health over time
- Identify unwanted PATH modifications
- Document your system configuration
- Troubleshoot performance issues
