Here's the curl command to get the list of snapshots from your API:

```bash
curl -s http://localhost:3000/api/v1/snapshots | jq
```

To save the results to a file:

```bash
curl -s http://localhost:3000/api/v1/snapshots > snapshots.json
```

If your API requires authentication, add the Authorization header:

```bash
curl -s -H "Authorization: Bearer your-token-here" http://localhost:3000/api/v1/snapshots
```

To extract just the snapshot IDs:

```bash
curl -s http://localhost:3000/api/v1/snapshots | jq -r '.[].id'
```

```
SystemState_2025-03-09_05-27-30
SystemState_2025-03-09_05-27-41
```

Here's the curl command to get the list of files for a specific snapshot:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files
```

If you want to format it with jq for better readability:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files | jq
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files | jq
```

To extract just the file names:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files | jq -r '.[].name'
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files | jq -r '.[].name'
```

And if you want to filter only JSON files:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files | jq -r '.[].name' | grep '\.json$'
```

Here's the curl command to get a specific file from a snapshot:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Network.json
```

To get the content formatted with jq:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Network.json | jq
```

To extract just the content field (since the API likely returns a wrapper object):

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Network.json | jq '.content'
```

Here's a bash script to fetch all files for a specific snapshot:

```bash
#!/bin/bash

# Set snapshot ID
SNAPSHOT_ID="SystemState_2025-03-09_05-27-30"
OUTPUT_DIR="./snapshot_files/$SNAPSHOT_ID"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get list of files
FILES=$(curl -s http://localhost:3000/api/v1/snapshots/$SNAPSHOT_ID/files | jq -r '.[].name')

# Fetch each file
for file in $FILES; do
  echo "Fetching $file..."
  curl -s "http://localhost:3000/api/v1/snapshots/$SNAPSHOT_ID/files/$file" > "$OUTPUT_DIR/$file"

  # If it's a JSON file, try to extract and format content
  if [[ "$file" == *.json ]]; then
    # Try to extract content field if it exists
    jq -r '.content // .' "$OUTPUT_DIR/$file" > "$OUTPUT_DIR/${file%.json}_content.json"
  fi
done

echo "All files downloaded to $OUTPUT_DIR"
```

If you want to process files one by one manually, here are commands for each file in the list:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Browsers.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/DiskSpace.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Drivers.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Environment.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Fonts.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/index.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/InstalledPrograms.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/metadata.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Network.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/Path.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/PerformanceData.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/PythonInstallations.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/RegistrySettings.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/RunningServices.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/ScheduledTasks.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/StartupPrograms.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/summary.txt
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/WindowsFeatures.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-30/files/WindowsUpdates.json
```

Here are the curl commands to get each file from the second snapshot:

```bash
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/Browsers.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/DiskSpace.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/Drivers.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/Environment.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/Fonts.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/index.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/InstalledPrograms.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/metadata.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/Network.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/Path.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/PerformanceData.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/PythonInstallations.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/RegistrySettings.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/RunningServices.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/ScheduledTasks.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/StartupPrograms.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/summary.txt
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/WindowsFeatures.json
curl -s http://localhost:3000/api/v1/snapshots/SystemState_2025-03-09_05-27-41/files/WindowsUpdates.json
```

If you want a script to download all these files automatically:

```bash
#!/bin/bash

# Set snapshot ID
SNAPSHOT_ID="SystemState_2025-03-09_05-27-41"
OUTPUT_DIR="./snapshot_files/$SNAPSHOT_ID"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get list of files
FILES=$(curl -s http://localhost:3000/api/v1/snapshots/$SNAPSHOT_ID/files | jq -r '.[].name')

# Fetch each file
for file in $FILES; do
  echo "Fetching $file..."
  curl -s "http://localhost:3000/api/v1/snapshots/$SNAPSHOT_ID/files/$file" > "$OUTPUT_DIR/$file"

  # If it's a JSON file, try to extract and format content
  if [[ "$file" == *.json ]]; then
    # Try to extract content field if it exists
    jq -r '.content // .' "$OUTPUT_DIR/$file" > "$OUTPUT_DIR/${file%.json}_content.json"
  fi
done

echo "All files downloaded to $OUTPUT_DIR"
```

You can save this as `download_snapshot.sh`, make it executable with `chmod +x download_snapshot.sh`, and then run it to download all files from this snapshot.
