#!/bin/bash

# Script to run the Election Source application with AI data logging

# Help function
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help                  Show this help message and exit"
    echo "  --csv <file>            Use CSV file as data source instead of Google Civic API"
    echo "  --limit <number>        Process only specified number of elections (for testing)"
    echo "  --log-level <level>     Set log level (debug, info, warn, error)"
    echo ""
    echo "Examples:"
    echo "  $0 --csv ./data/elections.csv     Run with CSV file input"
    echo "  $0 --limit 1                      Process only one election (for testing)"
    echo "  $0 --log-level debug              Run with debug log level"
}

# Parse command line arguments
CSV_FILE=""
ELECTION_LIMIT=""
LOG_LEVEL=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            show_help
            exit 0
            ;;
        --csv)
            if [[ -z "$2" || "$2" == --* ]]; then
                echo "Error: --csv requires a file path"
                exit 1
            fi
            CSV_FILE="$2"
            shift 2
            ;;
        --limit)
            if [[ -z "$2" || "$2" == --* ]]; then
                echo "Error: --limit requires a number"
                exit 1
            fi
            ELECTION_LIMIT="$2"
            shift 2
            ;;
        --log-level)
            if [[ -z "$2" || "$2" == --* ]]; then
                echo "Error: --log-level requires a level"
                exit 1
            fi
            LOG_LEVEL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set environment variables based on arguments
if [[ -n "$ELECTION_LIMIT" ]]; then
    export ELECTION_LIMIT="$ELECTION_LIMIT"
fi

if [[ -n "$LOG_LEVEL" ]]; then
    export LOG_LEVEL="$LOG_LEVEL"
fi

# Display banner
echo "======================================================"
echo "   ELECTION SOURCE WITH AI DATA LOGGING"
echo "======================================================"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Run the application with TypeScript directly
echo "Starting the application with AI data logging..."

# Prepare CSV argument if needed
CSV_ARGS=""
if [[ -n "$CSV_FILE" ]]; then
    echo "Using CSV file as data source: $CSV_FILE"
    CSV_ARGS="--csv $CSV_FILE"
fi

# Run the application
npx ts-node src/index-with-logging.ts $CSV_ARGS

# Check if the application completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "======================================================"
    echo "   APPLICATION COMPLETED SUCCESSFULLY"
    echo "======================================================"
    echo ""
    echo "AI data logs have been saved to the ./ai-logs directory."
    echo "You can browse the logs by opening the most recent folder."
    
    # Find the most recent log directory
    LATEST_DIR=$(ls -td ./ai-logs/*/ 2>/dev/null | head -1)
    
    if [ -n "$LATEST_DIR" ]; then
        echo ""
        echo "Latest log directory: $LATEST_DIR"
        echo ""
        echo "Folders in the latest run:"
        ls -la "$LATEST_DIR"
        
        # Count the number of elections processed
        # Adapt for CSV input or Civic API input
        if [ -d "$LATEST_DIR/csv-input" ]; then
            INPUT_COUNT=$(ls -1 "$LATEST_DIR/csv-input" 2>/dev/null | grep -v "^\..*" | wc -l)
            echo ""
            echo "Data source: CSV file"
        else
            INPUT_COUNT=$(ls -1 "$LATEST_DIR/civic-api" 2>/dev/null | grep -v "^\..*" | wc -l)
            echo ""
            echo "Data source: Google Civic API"
        fi
        
        RESEARCH_COUNT=$(ls -1 "$LATEST_DIR/gemini-research" 2>/dev/null | grep -v "^\..*" | wc -l)
        JSON_COUNT=$(ls -1 "$LATEST_DIR/gemini-json" 2>/dev/null | grep _raw.json | wc -l)
        
        echo ""
        echo "Summary:"
        echo "- Input data files: $INPUT_COUNT"
        echo "- Gemini research responses: $RESEARCH_COUNT"
        echo "- Gemini JSON outputs: $JSON_COUNT"
    else
        echo "No log directories found."
    fi
else
    echo ""
    echo "======================================================"
    echo "   APPLICATION FAILED"
    echo "======================================================"
    echo ""
    echo "Check the logs for details."
fi

echo ""
echo "Done."