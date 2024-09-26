#!/bin/bash

# Navigate to the directory containing this script
cd "$(dirname "$0")"

# Start the Python 3 HTTP server on port 8000
echo "Starting web server at http://localhost:8000/"
python3 -m http.server 8000
