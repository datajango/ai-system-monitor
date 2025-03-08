# BrowserCollector.ps1
# Collects information about installed browsers and their extensions

function Get-BrowserData {
    [CmdletBinding()]
    param()
    
    Write-Host "Collecting browser information..." -ForegroundColor Yellow
    
    $browserData = @{
        InstalledBrowsers = @()
        ChromeExtensions = @()
        EdgeExtensions = @()
        FirefoxAddons = @()
    }
    
    # Detect installed browsers
    try {
        $browsers = @()
        
        # Chrome
        $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
        $chromePath86 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        
        if (Test-Path $chromePath) {
            $version = (Get-Item $chromePath).VersionInfo.ProductVersion
            $browsers += @{
                Name = "Google Chrome"
                Path = $chromePath
                Version = $version
            }
        } elseif (Test-Path $chromePath86) {
            $version = (Get-Item $chromePath86).VersionInfo.ProductVersion
            $browsers += @{
                Name = "Google Chrome"
                Path = $chromePath86
                Version = $version
            }
        }
        
        # Firefox
        $firefoxPath = "C:\Program Files\Mozilla Firefox\firefox.exe"
        $firefoxPath86 = "C:\Program Files (x86)\Mozilla Firefox\firefox.exe"
        
        if (Test-Path $firefoxPath) {
            $version = (Get-Item $firefoxPath).VersionInfo.ProductVersion
            $browsers += @{
                Name = "Mozilla Firefox"
                Path = $firefoxPath
                Version = $version
            }
        } elseif (Test-Path $firefoxPath86) {
            $version = (Get-Item $firefoxPath86).VersionInfo.ProductVersion
            $browsers += @{
                Name = "Mozilla Firefox"
                Path = $firefoxPath86
                Version = $version
            }
        }
        
        # Edge
        $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        
        if (Test-Path $edgePath) {
            $version = (Get-Item $edgePath).VersionInfo.ProductVersion
            $browsers += @{
                Name = "Microsoft Edge"
                Path = $edgePath
                Version = $version
            }
        }
        
        $browserData.InstalledBrowsers = $browsers
    } catch {
        $browserData.InstalledBrowsers = "Unable to collect browser information"
    }
    
    # Get Chrome extensions
    try {
        $chromeExtPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions"
        
        if (Test-Path $chromeExtPath) {
            $extensions = @()
            
            Get-ChildItem -Path $chromeExtPath -Directory | ForEach-Object {
                $extId = $_.Name
                
                # Try to find manifest in the latest version folder
                $versionFolders = Get-ChildItem -Path $_.FullName -Directory | Sort-Object Name -Descending
                
                foreach ($versionFolder in $versionFolders) {
                    $manifestPath = Join-Path $versionFolder.FullName "manifest.json"
                    
                    if (Test-Path $manifestPath) {
                        try {
                            $manifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json
                            
                            $extensions += @{
                                ID = $extId
                                Name = if ($manifest.name) { 
                                    if ($manifest.name -match '\_\_MSG_(.+)\_\_' -or $manifest.name -match '^__(.+)__$') { 
                                        "Localized: $($matches[1])" 
                                    } else { 
                                        $manifest.name 
                                    }
                                } else { 
                                    "Unknown" 
                                }
                                Version = if ($manifest.version) { $manifest.version } else { $versionFolder.Name }
                                Description = if ($manifest.description) { 
                                    if ($manifest.description -match '\_\_MSG_(.+)\_\_' -or $manifest.description -match '^__(.+)__$') { 
                                        "Localized" 
                                    } else { 
                                        $manifest.description.Substring(0, [Math]::Min(50, $manifest.description.Length)) + "..." 
                                    }
                                } else { 
                                    "No description" 
                                }
                            }
                            
                            break  # Found a valid manifest, no need to check older versions
                        } catch {
                            # Failed to parse manifest, try next version
                        }
                    }
                }
            }
            
            $browserData.ChromeExtensions = $extensions
        }
    } catch {
        $browserData.ChromeExtensions = "Unable to collect Chrome extensions"
    }
    
    # Get Edge extensions (same structure as Chrome)
    try {
        $edgeExtPath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Extensions"
        
        if (Test-Path $edgeExtPath) {
            $extensions = @()
            
            Get-ChildItem -Path $edgeExtPath -Directory | ForEach-Object {
                $extId = $_.Name
                
                # Try to find manifest in the latest version folder
                $versionFolders = Get-ChildItem -Path $_.FullName -Directory | Sort-Object Name -Descending
                
                foreach ($versionFolder in $versionFolders) {
                    $manifestPath = Join-Path $versionFolder.FullName "manifest.json"
                    
                    if (Test-Path $manifestPath) {
                        try {
                            $manifest = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json
                            
                            $extensions += @{
                                ID = $extId
                                Name = if ($manifest.name) { 
                                    if ($manifest.name -match '\_\_MSG_(.+)\_\_' -or $manifest.name -match '^__(.+)__$') { 
                                        "Localized: $($matches[1])" 
                                    } else { 
                                        $manifest.name 
                                    }
                                } else { 
                                    "Unknown" 
                                }
                                Version = if ($manifest.version) { $manifest.version } else { $versionFolder.Name }
                                Description = if ($manifest.description) { 
                                    if ($manifest.description -match '\_\_MSG_(.+)\_\_' -or $manifest.description -match '^__(.+)__$') { 
                                        "Localized" 
                                    } else { 
                                        $manifest.description.Substring(0, [Math]::Min(50, $manifest.description.Length)) + "..." 
                                    }
                                } else { 
                                    "No description" 
                                }
                            }
                            
                            break  # Found a valid manifest, no need to check older versions
                        } catch {
                            # Failed to parse manifest, try next version
                        }
                    }
                }
            }
            
            $browserData.EdgeExtensions = $extensions
        }
    } catch {
        $browserData.EdgeExtensions = "Unable to collect Edge extensions"
    }
    
    # Get Firefox add-ons (more complex, limited information available)
    try {
        $firefoxProfilePath = "$env:APPDATA\Mozilla\Firefox\Profiles"
        
        if (Test-Path $firefoxProfilePath) {
            $addons = @()
            
            Get-ChildItem -Path $firefoxProfilePath -Directory | ForEach-Object {
                $extensionsJson = Join-Path $_.FullName "extensions.json"
                
                if (Test-Path $extensionsJson) {
                    try {
                        $extData = Get-Content -Path $extensionsJson -Raw | ConvertFrom-Json
                        
                        if ($extData.addons) {
                            foreach ($addon in $extData.addons) {
                                if (-not $addon.defaultLocale -or $addon.type -ne "extension") {
                                    continue
                                }
                                
                                $addons += @{
                                    ID = $addon.id
                                    Name = $addon.defaultLocale.name
                                    Version = $addon.version
                                    Description = if ($addon.defaultLocale.description) {
                                        $desc = $addon.defaultLocale.description
                                        $desc.Substring(0, [Math]::Min(50, $desc.Length)) + "..."
                                    } else {
                                        "No description"
                                    }
                                    Active = $addon.active
                                }
                            }
                        }
                    } catch {
                        # Failed to parse extensions.json
                    }
                }
            }
            
            $browserData.FirefoxAddons = $addons
        }
    } catch {
        $browserData.FirefoxAddons = "Unable to collect Firefox add-ons"
    }
    
    return $browserData
}