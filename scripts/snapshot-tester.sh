#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:3000/api/v1"
OUTPUT_DIR="./api-validation"
SCHEMA_DIR="./schemas"  # Directory for future JSON schemas

# Create output directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$SCHEMA_DIR"

# Set up logging
log_file="$OUTPUT_DIR/validation.log"
echo "API Validation Run: $(date)" > "$log_file"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to log messages
log() {
  local level=$1
  local message=$2
  echo "$(date +"%Y-%m-%d %H:%M:%S") [$level] $message" >> "$log_file"
  
  case $level in
    INFO)  echo -e "${NC}$message";;
    SUCCESS) echo -e "${GREEN}$message${NC}";;
    WARNING) echo -e "${YELLOW}$message${NC}";;
    ERROR) echo -e "${RED}$message${NC}";;
  esac
}

# Function to check if JSON is valid
validate_json() {
  local file=$1
  if jq empty "$file" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

# Function to perform basic schema validation (placeholder for now)
validate_schema() {
  local file=$1
  local file_type=$2
  
  # For now, just check if it's a JSON object or array
  if jq 'if type=="object" or type=="array" then true else false end' "$file" | grep -q true; then
    return 0
  else
    return 1
  fi
  
  # In the future, use a real schema validator:
  # jsonschema -i "$file" "$SCHEMA_DIR/${file_type}_schema.json"
}

# 1. Get list of all snapshots
log "INFO" "Fetching list of all snapshots..."
curl -s "$API_BASE_URL/snapshots" > "$OUTPUT_DIR/all_snapshots.json"

if ! validate_json "$OUTPUT_DIR/all_snapshots.json"; then
  log "ERROR" "Failed to get valid snapshots list"
  exit 1
fi

# 2. Extract snapshot IDs using jq
log "INFO" "Extracting snapshot IDs..."
SNAPSHOT_IDS=$(jq -r '.[].id' "$OUTPUT_DIR/all_snapshots.json")

if [ -z "$SNAPSHOT_IDS" ]; then
  log "WARNING" "No snapshots found"
  exit 0
fi

log "SUCCESS" "Found $(echo "$SNAPSHOT_IDS" | wc -l | tr -d ' ') snapshots"

# 3 & 4. Fetch and validate each snapshot and its files
for snapshot_id in $SNAPSHOT_IDS; do
  log "INFO" "Processing snapshot: $snapshot_id"
  
  # Create directory for this snapshot
  snapshot_dir="$OUTPUT_DIR/$snapshot_id"
  mkdir -p "$snapshot_dir"
  
  # Get snapshot details
  log "INFO" "Fetching snapshot details..."
  curl -s "$API_BASE_URL/snapshots/$snapshot_id" > "$snapshot_dir/snapshot.json"
  
  if ! validate_json "$snapshot_dir/snapshot.json"; then
    log "ERROR" "Invalid JSON response for snapshot $snapshot_id"
    continue
  fi
  
  # Get list of files in snapshot
  log "INFO" "Fetching list of files..."
  curl -s "$API_BASE_URL/snapshots/$snapshot_id/files" > "$snapshot_dir/files_list.json"
  
  if ! validate_json "$snapshot_dir/files_list.json"; then
    log "ERROR" "Invalid JSON response for files list in snapshot $snapshot_id"
    continue
  fi
  
  # Extract file names
  FILES=$(jq -r '.[].name' "$snapshot_dir/files_list.json" | grep '\.json$')
  
  log "INFO" "Found $(echo "$FILES" | wc -l | tr -d ' ') JSON files in snapshot $snapshot_id"
  
  # Create a results summary file
  echo "Snapshot: $snapshot_id" > "$snapshot_dir/validation_summary.txt"
  echo "Files validated: 0" >> "$snapshot_dir/validation_summary.txt"
  echo "Valid files: 0" >> "$snapshot_dir/validation_summary.txt"
  echo "Invalid files: 0" >> "$snapshot_dir/validation_summary.txt"
  echo "-------------------------" >> "$snapshot_dir/validation_summary.txt"
  
  valid_count=0
  invalid_count=0
  
  # Get each file and validate it
  for file in $FILES; do
    file_name=$(basename "$file")
    file_type="${file_name%.*}"  # Remove extension to get type
    
    log "INFO" "Fetching file: $file_name"
    curl -s "$API_BASE_URL/snapshots/$snapshot_id/files/$file" > "$snapshot_dir/$file_name"
    
    # Check if response is valid JSON
    if ! validate_json "$snapshot_dir/$file_name"; then
      log "ERROR" "Invalid JSON in file: $file_name"
      echo "$file_name: INVALID JSON" >> "$snapshot_dir/validation_summary.txt"
      invalid_count=$((invalid_count + 1))
      continue
    fi
    
    # Extract content from API response
    jq -r '.content' "$snapshot_dir/$file_name" > "$snapshot_dir/${file_name%.json}_content.json"
    
    # Validate content against basic schema rules
    if validate_schema "$snapshot_dir/${file_name%.json}_content.json" "$file_type"; then
      log "SUCCESS" "File $file_name passes basic validation"
      echo "$file_name: VALID" >> "$snapshot_dir/validation_summary.txt"
      valid_count=$((valid_count + 1))
      
      # 5. Save observed schema for future reference
      jq 'if type=="object" then keys | map({(.): (.. | objects | keys) | unique | sort}) | add else null end' \
         "$snapshot_dir/${file_name%.json}_content.json" > "$SCHEMA_DIR/${file_type}_observed_schema.json"
    else
      log "WARNING" "File $file_name fails schema validation"
      echo "$file_name: INVALID SCHEMA" >> "$snapshot_dir/validation_summary.txt"
      invalid_count=$((invalid_count + 1))
    fi
  done
  
  # Update validation summary
  total_files=$((valid_count + invalid_count))
  sed -i "s/Files validated: 0/Files validated: $total_files/" "$snapshot_dir/validation_summary.txt"
  sed -i "s/Valid files: 0/Valid files: $valid_count/" "$snapshot_dir/validation_summary.txt"
  sed -i "s/Invalid files: 0/Invalid files: $invalid_count/" "$snapshot_dir/validation_summary.txt"
  
  log "SUCCESS" "Snapshot $snapshot_id processing complete. Valid: $valid_count, Invalid: $invalid_count"
done

log "SUCCESS" "API validation complete. Results saved to $OUTPUT_DIR"
log "INFO" "Run 'cat $log_file' to see detailed log"

# Generate a consolidated schema suggestion based on all observed schemas
find "$SCHEMA_DIR" -name "*_observed_schema.json" -exec jq -s 'reduce .[] as $item ({}; . * $item)' {} \; > "$SCHEMA_DIR/consolidated_schema.json"