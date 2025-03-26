# Updates to add to README.md

## CSV Data Source Feature

We've added support for using CSV files as an alternative data source instead of the Google Civic API. This gives you more flexibility in how you run the application.

### Key features:

- Run the application without requiring a Google Civic API key
- Process custom elections that may not be available in the API
- Test with a controlled set of elections
- Reprocess specific elections from previous runs

### Usage:

```bash
# Using the run script with CSV data
./run-with-logging.sh --csv path/to/your/elections.csv

# Directly with the application
npm run dev -- --csv path/to/your/elections.csv
```

See the [CSV Input Documentation](CSV_INPUT.md) for detailed instructions and format specifications.

## Updated CLI options

The run script now supports the following options:

```
Usage: ./run-with-logging.sh [options]

Options:
  --help                  Show this help message and exit
  --csv <file>            Use CSV file as data source instead of Google Civic API
  --limit <number>        Process only specified number of elections (for testing)
  --log-level <level>     Set log level (debug, info, warn, error)
```

## Updated Project Structure

```
election-source/
├── ...
├── CSV_INPUT.md          # CSV input documentation
├── docs/
│   └── sample_elections.csv  # Sample CSV template
├── src/
│   ├── apis/
│   │   ├── civic/        # Google Civic API
│   │   ├── csv/          # CSV data source (NEW)
│   │   └── gemini/       # Gemini Deep Research API
│   ├── ...
└── ...
```