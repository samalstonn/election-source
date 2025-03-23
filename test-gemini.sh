#!/bin/bash

API_KEY="AIzaSyCaQLoUwmUODNXqjlLiYZnoGAfuvS3hfiw"
QUERY_FILE="query.json"

# Create the query file
cat > $QUERY_FILE << 'EOL'
{
  "contents": [
    {
      "parts": [
        {
          "text": "Provide details about the South Carolina Special Election - State House District 113 scheduled for 2025-03-25. Include: 1) The position details 2) Names of candidates running 3) Brief background of each candidate."
        }
      ]
    }
  ]
}
EOL

# Run the curl command
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d @$QUERY_FILE

# Clean up
rm $QUERY_FILE