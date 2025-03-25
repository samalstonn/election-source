#!/bin/bash

# Script to run the Election Source application with AI data logging

# Set environment variables for testing (optional)
# Uncomment and adjust as needed
# export ELECTION_LIMIT=1  # Process only one election (for testing)
# export LOG_LEVEL=debug   # Set more verbose logging

# Display banner
echo "======================================================"
echo "   ELECTION SOURCE WITH AI DATA LOGGING"
echo "======================================================"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Run the application with TypeScript directly
echo "Starting the application with AI data logging..."
npx ts-node src/index-with-logging.ts

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
        CIVIC_COUNT=$(ls -1 "$LATEST_DIR/civic-api" 2>/dev/null | wc -l)
        RESEARCH_COUNT=$(ls -1 "$LATEST_DIR/gemini-research" 2>/dev/null | wc -l)
        JSON_COUNT=$(ls -1 "$LATEST_DIR/gemini-json" 2>/dev/null | grep _raw.json | wc -l)
        
        echo ""
        echo "Summary:"
        echo "- Civic API responses: $CIVIC_COUNT"
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