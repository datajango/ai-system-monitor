# System State Analyzer

A powerful tool for analyzing Windows system state snapshots using Large Language Models (LLMs).

## Overview

The System State Analyzer is designed to process and analyze Windows system snapshots created by the System State Collector. It leverages LLMs via the LM Studio API to generate insights, identify issues, and provide optimization recommendations across multiple system components.

The analyzer takes the structured data in a snapshot directory and uses specialized analyzers for different aspects of the system (Network, Registry, Services, etc.), turning raw system data into actionable intelligence.

## Key Features

- Comprehensive analysis of Windows system configurations
- Component-specific analysis using specialized analyzers
- LLM-powered insights and recommendations
- Structured JSON output for programmatic consumption
- Support for batch processing of multiple snapshots
- Detailed logging of LLM interactions for transparency
- Flexible configuration via `.env` files or command line

## Installation

### Prerequisites

- Python 3.8 or higher
- Access to LM Studio server (local or remote)
- PowerShell 5.1 or higher (for running the System State Collector)
- Appropriate permissions to read system state snapshot files

### Setup

1. Clone this repository:
   ```
   git clone https://github.com/your-org/system-state-analyzer.git
   cd system-state-analyzer
   ```

2. Install required packages:
   ```
   pip install -r requirements.txt
   ```

3. Create a configuration file (optional):
   ```
   python main.py --create-env
   ```
   This will create a `.env` file with default settings that you can customize.

## Usage

### Basic Analysis

To analyze a single system state snapshot:

```
python main.py /path/to/SystemState_yyyy-MM-dd_HH-mm-ss --output-dir /path/to/output
```

### Specify LM Studio Server and Model

```
python main.py /path/to/snapshot --server-url http://localhost:1234/v1 --model gemma-2-9b-it --output-dir /path/to/output
```

### Batch Processing

To process multiple snapshots at once:

```
python main.py --input-dir /path/to/snapshots/directory --model gemma-2-9b-it --output-dir /path/to/analysis
```

### Focus on Specific Sections

To analyze only specific sections:

```
python main.py /path/to/snapshot --focus Network InstalledPrograms DiskSpace
```

### List Available Analyzers

```
python main.py --list-analyzers
```

### List Available Models

```
python main.py --list-models
```

## Output Structure

The analyzer generates a structured output for each snapshot:

```
SystemState_yyyy-MM-dd_HH-mm-ss/
├── NetworkAnalysis.json
├── InstalledProgramsAnalysis.json
├── DiskSpaceAnalysis.json
├── ... [other section analyses]
├── summaryAnalysis.json
└── llm/
    ├── Network_llm_interaction.json
    ├── InstalledPrograms_llm_interaction.json
    ├── ... [other LLM interaction logs]
    └── summary_llm_interaction.json
```

Each analysis file contains:
- Issues identified (with severity levels)
- Optimization opportunities
- Summary assessment
- Recommendations for action

## Configuration

### Environment Variables

The analyzer supports configuration via environment variables or a `.env` file:

- `LLM_SERVER_URL`: URL of the LM Studio server (default: http://localhost:1234/v1)
- `LLM_MODEL`: Model name to use (e.g., gemma-2-9b-it)
- `LLM_MAX_TOKENS`: Maximum tokens for responses (default: 4096)
- `LLM_TEMPERATURE`: Temperature setting for generation (default: 0.7)

### Command Line Options

For a complete list of command line options:

```
python main.py --help
```

## Analysis Components

The analyzer includes specialized components for different aspects of the system:

1. **Network**: Analyzes network adapters, IP configurations, DNS settings, and connections
2. **Installed Programs**: Examines installed software for security issues and bloatware
3. **Startup Programs**: Identifies applications that start automatically and their impact
4. **Running Services**: Evaluates Windows services and their security implications
5. **Disk Space**: Analyzes storage utilization and identifies low space conditions
6. **Performance Data**: Examines CPU and memory usage patterns
7. **Path**: Analyzes the PATH environment variable for security and issues
8. **Environment**: Evaluates environment variables and their configuration
9. **Registry Settings**: Examines important registry configurations
10. **Windows Features**: Analyzes enabled Windows features and their implications
11. **Windows Updates**: Examines update history and configuration
12. **Browsers**: Analyzes installed browsers and their extensions
13. **Python Installations**: Examines Python environments and configurations
14. **Fonts**: Analyzes installed font configurations
15. **Drivers**: Examines device drivers and their status
16. **Scheduled Tasks**: Analyzes Windows Task Scheduler configurations

## Advanced Features

### Chunking Strategy

For sections with large amounts of data (like Installed Programs or Network), the analyzer uses a chunking strategy to break the analysis into manageable pieces:

- Network analysis is divided into adapters, IP config, DNS, and connections
- Installed Programs analysis is categorized by program type (security, development, utilities, etc.)

### Performance Optimization

The analyzer includes several optimizations:
- Truncation of oversized JSON inputs to respect token limits
- Parallel processing capabilities for multi-system analysis
- Custom JSON extraction for robust handling of LLM responses

### Error Handling

The analyzer implements comprehensive error handling:
- Detailed logging of LLM interaction failures
- Fallback strategies when components fail
- Clear error messages with debugging options

## Development

### Adding New Analyzers

To create a new analyzer for a specific section:

1. Create a new file in the `prompts/analyzers` directory
2. Define a class that extends `BaseSectionAnalyzer`
3. Register it with the `@SectionAnalyzerRegistry.register` decorator
4. Implement the required methods (`section_name`, `extract_key_metrics`, `create_prompt`)

Example:

```python
@SectionAnalyzerRegistry.register
class MyNewAnalyzer(BaseSectionAnalyzer):
    """
    Analyzer for my new section.
    """
    
    @property
    def section_name(self) -> str:
        return "MyNewSection"
    
    # Implement other required methods
```

### Customizing Prompts

To modify the analysis prompts, edit the `section_prompts.py` file or update the `create_prompt` method in the relevant analyzer class.

## Troubleshooting

### Connection Issues

If you encounter connection issues with LM Studio:
- Verify the LM Studio server is running and accessible
- Check the server URL configuration
- Ensure the selected model is available on the server

### Analysis Errors

If an analysis fails:
- Run with `--debug` for detailed logging
- Check the LLM interaction logs in the output directory
- Verify the snapshot data is complete and valid

### Performance Issues

For large snapshots or batch processing:
- Adjust `MAX_JSON_LENGTH` in analyzer classes
- Focus on specific sections with the `--focus` parameter
- Run with a smaller, faster model for initial analysis

## License

[Specify your license information here]

## Acknowledgments

- The System State Collector team for providing the snapshot data
- LM Studio for providing the LLM infrastructure
- Contributors to this project

---

For more information, please refer to the detailed documentation for each analyzer component.
