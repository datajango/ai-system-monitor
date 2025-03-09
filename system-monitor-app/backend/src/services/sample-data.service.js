// backend/src/services/sample-data.service.js
'use strict'

// Service for generating sample data for testing and development
const sampleDataService = {
    // Generate sample snapshot data
    async generateSampleData(timestamp) {
        const now = timestamp || new Date();

        return {
            System: {
                computerName: 'DESKTOP-SAMPLE',
                osVersion: 'Windows 10 Pro',
                processorName: 'Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz',
                installedMemory: '32 GB',
                systemDrive: 'C:',
                systemTime: now.toISOString()
            },
            Network: {
                adapters: [
                    {
                        name: 'Ethernet',
                        ipAddress: '192.168.1.100',
                        macAddress: '00-11-22-33-44-55',
                        status: 'Up'
                    },
                    {
                        name: 'Wi-Fi',
                        ipAddress: '',
                        macAddress: 'AA-BB-CC-DD-EE-FF',
                        status: 'Down'
                    }
                ],
                connections: [
                    {
                        localAddress: '192.168.1.100:54321',
                        remoteAddress: '172.217.20.14:443',
                        state: 'ESTABLISHED',
                        processId: 1234,
                        processName: 'chrome.exe'
                    }
                ]
            },
            InstalledPrograms: {
                count: 52,
                programs: [
                    {
                        name: 'Google Chrome',
                        version: '123.0.6312.87',
                        publisher: 'Google LLC',
                        installDate: '2024-01-15'
                    },
                    {
                        name: 'Mozilla Firefox',
                        version: '124.0',
                        publisher: 'Mozilla',
                        installDate: '2024-02-20'
                    },
                    {
                        name: 'Microsoft Visual Studio Code',
                        version: '1.87.0',
                        publisher: 'Microsoft Corporation',
                        installDate: '2024-03-05'
                    }
                ]
            },
            Path: {
                variables: [
                    'C:\\Windows\\system32',
                    'C:\\Windows',
                    'C:\\Windows\\System32\\Wbem',
                    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\',
                    'C:\\Program Files\\nodejs\\',
                    'C:\\Program Files\\Git\\cmd'
                ],
                invalidPaths: []
            },
            DiskSpace: {
                drives: [
                    {
                        name: 'C:',
                        label: 'System',
                        totalSpace: 512000000000,
                        freeSpace: 125000000000,
                        percentUsed: 75.6
                    },
                    {
                        name: 'D:',
                        label: 'Data',
                        totalSpace: 1024000000000,
                        freeSpace: 650000000000,
                        percentUsed: 36.5
                    }
                ]
            },
            Browsers: {
                installed: [
                    {
                        name: 'Google Chrome',
                        version: '123.0.6312.87',
                        defaultBrowser: true,
                        installPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                    },
                    {
                        name: 'Mozilla Firefox',
                        version: '124.0',
                        defaultBrowser: false,
                        installPath: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe'
                    }
                ],
                extensions: [
                    {
                        browser: 'Chrome',
                        name: 'uBlock Origin',
                        version: '1.54.0',
                        enabled: true
                    }
                ]
            },
            Drivers: this.generateSampleDrivers(),
            Environment: this.generateSampleEnvironment(),
            Fonts: this.generateSampleFonts(),
            PerformanceData: this.generateSamplePerformance(now),
            PythonInstallations: this.generateSamplePythonInstallations(),
            RegistrySettings: this.generateSampleRegistrySettings(),
            RunningServices: this.generateSampleRunningServices(),
            ScheduledTasks: this.generateSampleScheduledTasks(),
            StartupPrograms: this.generateSampleStartupPrograms(),
            WindowsFeatures: this.generateSampleWindowsFeatures(),
            WindowsUpdates: this.generateSampleWindowsUpdates()
        };
    },

    // Generate sample drivers data
    generateSampleDrivers() {
        return {
            count: 154,
            items: [
                {
                    name: 'Intel(R) Network Adapter Driver',
                    version: '12.18.9.23',
                    provider: 'Intel Corporation',
                    status: 'Running'
                },
                {
                    name: 'NVIDIA Graphics Driver',
                    version: '531.41',
                    provider: 'NVIDIA Corporation',
                    status: 'Running'
                },
                {
                    name: 'Realtek High Definition Audio Driver',
                    version: '6.0.9285.1',
                    provider: 'Realtek Semiconductor Corp.',
                    status: 'Running'
                }
            ]
        };
    },

    // Generate sample environment variables
    generateSampleEnvironment() {
        return {
            variables: {
                system: {
                    'ALLUSERSPROFILE': 'C:\\ProgramData',
                    'APPDATA': 'C:\\Users\\User\\AppData\\Roaming',
                    'CommonProgramFiles': 'C:\\Program Files\\Common Files',
                    'COMPUTERNAME': 'DESKTOP-SAMPLE',
                    'ComSpec': 'C:\\Windows\\system32\\cmd.exe',
                    'HOMEDRIVE': 'C:',
                    'HOMEPATH': '\\Users\\User',
                    'LOCALAPPDATA': 'C:\\Users\\User\\AppData\\Local',
                    'LOGONSERVER': '\\\\DESKTOP-SAMPLE',
                    'NUMBER_OF_PROCESSORS': '8',
                    'OS': 'Windows_NT',
                    'Path': 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;C:\\Program Files\\nodejs\\;C:\\Program Files\\Git\\cmd',
                    'PROCESSOR_ARCHITECTURE': 'AMD64',
                    'ProgramData': 'C:\\ProgramData',
                    'ProgramFiles': 'C:\\Program Files',
                    'ProgramFiles(x86)': 'C:\\Program Files (x86)',
                    'TEMP': 'C:\\Users\\User\\AppData\\Local\\Temp',
                    'TMP': 'C:\\Users\\User\\AppData\\Local\\Temp',
                    'USERDOMAIN': 'DESKTOP-SAMPLE',
                    'USERNAME': 'User',
                    'USERPROFILE': 'C:\\Users\\User',
                    'windir': 'C:\\Windows'
                },
                user: {
                    'APPDATA': 'C:\\Users\\User\\AppData\\Roaming',
                    'LOCALAPPDATA': 'C:\\Users\\User\\AppData\\Local',
                    'TEMP': 'C:\\Users\\User\\AppData\\Local\\Temp',
                    'TMP': 'C:\\Users\\User\\AppData\\Local\\Temp',
                    'USERPROFILE': 'C:\\Users\\User'
                }
            }
        };
    },

    // Generate sample fonts data
    generateSampleFonts() {
        return {
            count: 189,
            items: [
                {
                    name: 'Arial',
                    type: 'TrueType',
                    path: 'C:\\Windows\\Fonts\\arial.ttf'
                },
                {
                    name: 'Calibri',
                    type: 'TrueType',
                    path: 'C:\\Windows\\Fonts\\calibri.ttf'
                },
                {
                    name: 'Consolas',
                    type: 'TrueType',
                    path: 'C:\\Windows\\Fonts\\consola.ttf'
                },
                {
                    name: 'Segoe UI',
                    type: 'TrueType',
                    path: 'C:\\Windows\\Fonts\\segoeui.ttf'
                }
            ]
        };
    },

    // Generate sample performance data
    generateSamplePerformance(timestamp) {
        const now = timestamp || new Date();

        return {
            timestamp: now.toISOString(),
            cpu: {
                usage: 15.2,
                temperature: 45.3,
                processCount: 145
            },
            memory: {
                total: 34359738368, // 32 GB
                used: 8589934592,   // 8 GB
                free: 25769803776,  // 24 GB
                percentUsed: 25.0
            },
            disk: {
                readRate: 1500000,  // bytes per second
                writeRate: 750000,  // bytes per second
                queueLength: 0.01,
                responseTime: 12    // milliseconds
            },
            network: {
                receivedRate: 250000,  // bytes per second
                sentRate: 50000,       // bytes per second
                tcpConnections: 35,
                udpConnections: 8
            },
            topProcesses: [
                {
                    name: 'chrome.exe',
                    pid: 1234,
                    cpuUsage: 4.5,
                    memoryUsage: 1258291200  // 1.2 GB
                },
                {
                    name: 'explorer.exe',
                    pid: 2345,
                    cpuUsage: 0.8,
                    memoryUsage: 78643200  // 75 MB
                },
                {
                    name: 'code.exe',
                    pid: 3456,
                    cpuUsage: 2.1,
                    memoryUsage: 524288000  // 500 MB
                }
            ]
        };
    },

    // Generate sample Python installations data
    generateSamplePythonInstallations() {
        return {
            count: 2,
            installations: [
                {
                    version: '3.10.6',
                    path: 'C:\\Python310\\python.exe',
                    is64Bit: true,
                    packages: [
                        { name: 'numpy', version: '1.24.3' },
                        { name: 'pandas', version: '2.0.2' },
                        { name: 'matplotlib', version: '3.7.1' }
                    ]
                },
                {
                    version: '3.9.13',
                    path: 'C:\\Python39\\python.exe',
                    is64Bit: true,
                    packages: [
                        { name: 'numpy', version: '1.23.5' },
                        { name: 'pandas', version: '1.5.3' },
                        { name: 'django', version: '4.2.1' }
                    ]
                }
            ]
        };
    },

    // Generate sample registry settings
    generateSampleRegistrySettings() {
        return {
            performance: {
                'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters\\EnablePrefetcher': 3,
                'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters\\EnableSuperfetch': 3,
                'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\SystemResponsiveness': 20
            },
            security: {
                'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\EnableLUA': 1,
                'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\ConsentPromptBehaviorAdmin': 2,
                'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\\EnableSecureUIAPaths': 1
            },
            network: {
                'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\SynAttackProtect': 1,
                'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\TcpMaxConnectRetransmissions': 2,
                'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\EnableICMPRedirect': 0
            }
        };
    },

    // Generate sample running services
    generateSampleRunningServices() {
        return {
            count: 165,
            services: [
                {
                    name: 'wuauserv',
                    displayName: 'Windows Update',
                    status: 'Running',
                    startType: 'Automatic',
                    description: 'Enables the detection, download, and installation of updates for Windows and other programs.'
                },
                {
                    name: 'LanmanServer',
                    displayName: 'Server',
                    status: 'Running',
                    startType: 'Automatic',
                    description: 'Supports file, print, and named-pipe sharing over the network for this computer.'
                },
                {
                    name: 'WinDefend',
                    displayName: 'Windows Defender Antivirus Service',
                    status: 'Running',
                    startType: 'Automatic',
                    description: 'Helps protect users from malware and other potentially unwanted software.'
                },
                {
                    name: 'Spooler',
                    displayName: 'Print Spooler',
                    status: 'Running',
                    startType: 'Automatic',
                    description: 'Loads files to memory for later printing.'
                }
            ]
        };
    },

    // Generate sample scheduled tasks
    generateSampleScheduledTasks() {
        return {
            count: 47,
            tasks: [
                {
                    name: '\\Microsoft\\Windows\\Windows Defender\\Windows Defender Scheduled Scan',
                    path: '\\Microsoft\\Windows\\Windows Defender',
                    enabled: true,
                    lastRun: '2025-03-07T14:30:00Z',
                    nextRun: '2025-03-08T14:30:00Z',
                    triggers: ['Daily at 2:30 PM']
                },
                {
                    name: '\\Microsoft\\Windows\\WindowsUpdate\\Scheduled Start',
                    path: '\\Microsoft\\Windows\\WindowsUpdate',
                    enabled: true,
                    lastRun: '2025-03-07T03:00:00Z',
                    nextRun: '2025-03-08T03:00:00Z',
                    triggers: ['Daily at 3:00 AM']
                },
                {
                    name: '\\Microsoft\\Windows\\Defrag\\ScheduledDefrag',
                    path: '\\Microsoft\\Windows\\Defrag',
                    enabled: true,
                    lastRun: '2025-03-05T01:00:00Z',
                    nextRun: '2025-03-12T01:00:00Z',
                    triggers: ['Weekly on Wednesday at 1:00 AM']
                }
            ]
        };
    },

    // Generate sample startup programs
    generateSampleStartupPrograms() {
        return {
            count: 8,
            programs: [
                {
                    name: 'Microsoft Teams',
                    command: 'C:\\Users\\User\\AppData\\Local\\Microsoft\\Teams\\Update.exe --processStart "Teams.exe"',
                    location: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
                    user: 'User'
                },
                {
                    name: 'OneDrive',
                    command: '"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe" /background',
                    location: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
                    user: 'User'
                },
                {
                    name: 'NVIDIA Display',
                    command: 'C:\\Program Files\\NVIDIA Corporation\\Display.NvContainer\\NvContainer.exe',
                    location: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
                    user: 'System'
                }
            ]
        };
    },

    // Generate sample Windows features
    generateSampleWindowsFeatures() {
        return {
            enabled: [
                {
                    name: 'Microsoft-Windows-Subsystem-Linux',
                    displayName: 'Windows Subsystem for Linux',
                    description: 'Provides services and environments for running native Linux command-line tools',
                    status: 'Enabled'
                },
                {
                    name: 'NetFx4-AdvSrvs',
                    displayName: '.NET Framework 4.8 Advanced Services',
                    description: 'Provides advanced features for the .NET Framework 4.8',
                    status: 'Enabled'
                },
                {
                    name: 'IIS-WebServerRole',
                    displayName: 'Internet Information Services',
                    description: 'Web server role for hosting websites and web applications',
                    status: 'Enabled'
                }
            ],
            disabled: [
                {
                    name: 'WindowsMediaPlayer',
                    displayName: 'Windows Media Player',
                    description: 'Media player for playing audio and video files',
                    status: 'Disabled'
                },
                {
                    name: 'Windows-Defender-ApplicationGuard',
                    displayName: 'Windows Defender Application Guard',
                    description: 'Helps to isolate untrusted sites',
                    status: 'Disabled'
                }
            ]
        };
    },

    // Generate sample Windows updates
    generateSampleWindowsUpdates() {
        return {
            count: 24,
            lastChecked: '2025-03-08T00:15:00Z',
            updates: [
                {
                    updateId: 'KB5022845',
                    title: 'Security Update for Windows 10 Version 21H2',
                    description: 'A security update for Windows 10 Version 21H2',
                    installedOn: '2025-02-15',
                    status: 'Installed'
                },
                {
                    updateId: 'KB5023773',
                    title: 'Cumulative Update for Windows 10 Version 21H2',
                    description: 'March 2025 cumulative update for Windows 10 Version 21H2',
                    installedOn: '2025-03-05',
                    status: 'Installed'
                },
                {
                    updateId: 'KB890830',
                    title: 'Windows Malicious Software Removal Tool x64',
                    description: 'Tool to remove specific malicious software from computers',
                    installedOn: '2025-03-06',
                    status: 'Installed'
                }
            ]
        };
    }
}

module.exports = sampleDataService