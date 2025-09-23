#!/bin/bash
"""Setup cron job for weekly data rebuild."""

# Script to add weekly rebuild to crontab
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REBUILD_SCRIPT="$PROJECT_ROOT/scripts/weekly_rebuild.py"

# Make script executable
chmod +x "$REBUILD_SCRIPT"

# Create cron job entry (runs every Sunday at 2 AM)
CRON_JOB="0 2 * * 0 cd $PROJECT_ROOT && python $REBUILD_SCRIPT >> $PROJECT_ROOT/logs/weekly_rebuild.log 2>&1"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Add to crontab (avoid duplicates)
(crontab -l 2>/dev/null | grep -v "$REBUILD_SCRIPT"; echo "$CRON_JOB") | crontab -

echo "Weekly rebuild cron job added:"
echo "$CRON_JOB"
echo ""
echo "To view current crontab: crontab -l"
echo "To remove this job: crontab -e"