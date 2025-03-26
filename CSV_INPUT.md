# Using CSV Data Source for Election Source

## Overview

The Election Source application now supports using a CSV file as an alternative data source instead of the Google Civic API. This feature allows you to:

1. Run the application without requiring the Google Civic API key
2. Process custom elections that may not be available in the Google Civic API
3. Test the application with a controlled set of elections
4. Reprocess specific elections from previous runs

## CSV File Format

The CSV file must follow this format:

```csv
name,date
"Election Name 1","YYYY-MM-DD"
"Election Name 2","YYYY-MM-DD"
```

### Requirements:

- The file must have a header row with columns `name` and `date`
- The `name` column should contain the full election name (e.g., "South Carolina Special Election - State House District 113")
- The `date` column should contain the election date in YYYY-MM-DD format
- Names with commas should be enclosed in double quotes

## Running with CSV Source

### Using the Helper Script

The easiest way to run the application with a CSV file is to use the included run script:

```bash
./run-with-logging.sh --csv path/to/your/elections.csv
```

Additional options:
```
  --limit <number>        Process only specified number of elections (for testing)
  --log-level <level>     Set log level (debug, info, warn, error)
```

### Manual Execution

You can also run the application directly with Node.js/TypeScript:

```bash
# With AI data logging
npx ts-node src/index-with-logging.ts --csv path/to/your/elections.csv

# Without AI data logging
npx ts-node src/index.ts --csv path/to/your/elections.csv
```

### Environment Variable

Alternatively, you can set the CSV file path using an environment variable:

```bash
CSV_FILE_PATH=path/to/your/elections.csv npm run dev
```

## Sample CSV Template

A sample CSV template is provided in the repository:

```
name,date
"South Carolina Special Election - State House District 113","2025-03-25"
"Pennsylvania Special Election - State Senate District 36 & State House District 35","2025-03-25"
"Florida Special Elections","2025-04-01"
```

You can copy this file and modify it with your own elections.

## Logs and Output

When using a CSV file as the data source, the application will:

1. Create a separate folder for CSV input data in the logs directory
2. Log the original CSV file and a human-readable version
3. Process the elections and generate the same AI research and structured data as with the Civic API

The run summary will indicate that the CSV file was used as the data source.

## Troubleshooting

If you encounter issues with your CSV file:

1. Make sure the date format is YYYY-MM-DD
2. Check that the header row has the exact column names `name` and `date`
3. Ensure that election names with commas are enclosed in double quotes
4. Verify that the file is saved with UTF-8 encoding

For further assistance, check the application logs in the `logs` directory.