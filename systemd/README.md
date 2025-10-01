# FourMore OSM Update Automation with Systemd

This directory contains systemd service and timer units for automating OSM data updates in production.

## Overview

The systemd timer runs `make db-update` on a weekly schedule (Sunday 2 AM by default) to keep your OSM data current.

**Files:**
- `fourmore-osm-update.service` - The service that runs the update
- `fourmore-osm-update.timer` - The timer that schedules the service

## Installation

### 1. Configure the Service

Edit `fourmore-osm-update.service` and update these values:

```ini
User=YOUR_USERNAME              # User that owns the fourmore project
Group=YOUR_GROUP                # Group (often same as username)
WorkingDirectory=/path/to/fourmore   # Full path to your fourmore directory
EnvironmentFile=-/path/to/fourmore/.env.local  # Path to .env.local if you use one
```

### 2. Copy Files to Systemd Directory

```bash
# Copy the unit files
sudo cp systemd/fourmore-osm-update.service /etc/systemd/system/
sudo cp systemd/fourmore-osm-update.timer /etc/systemd/system/

# Set proper permissions
sudo chmod 644 /etc/systemd/system/fourmore-osm-update.service
sudo chmod 644 /etc/systemd/system/fourmore-osm-update.timer
```

### 3. Enable and Start the Timer

```bash
# Reload systemd to recognize the new units
sudo systemctl daemon-reload

# Enable the timer to start on boot
sudo systemctl enable fourmore-osm-update.timer

# Start the timer now
sudo systemctl start fourmore-osm-update.timer
```

## Verification

### Check Timer Status

```bash
# View timer status
systemctl status fourmore-osm-update.timer

# List all timers and see when next run is scheduled
systemctl list-timers fourmore-osm-update.timer
```

### Check Service Status

```bash
# View the service status (after it has run)
systemctl status fourmore-osm-update.service
```

### View Logs

```bash
# View recent logs
journalctl -u fourmore-osm-update.service

# Follow logs in real-time
journalctl -u fourmore-osm-update.service -f

# View logs from the last run
journalctl -u fourmore-osm-update.service --since "1 day ago"

# View logs with specific time range
journalctl -u fourmore-osm-update.service --since "2024-01-01" --until "2024-01-31"
```

## Manual Execution

To run an update manually without waiting for the timer:

```bash
# Trigger the service immediately
sudo systemctl start fourmore-osm-update.service

# Watch the logs while it runs
journalctl -u fourmore-osm-update.service -f
```

## Customizing the Schedule

Edit the timer file to change when updates run:

```bash
sudo nano /etc/systemd/system/fourmore-osm-update.timer
```

Common schedule examples:

```ini
# Daily at 2 AM
OnCalendar=*-*-* 02:00:00

# Every 3 days at 2 AM
OnCalendar=*-*-1,4,7,10,13,16,19,22,25,28,31 02:00:00

# Weekly on Sunday at 2 AM (default)
OnCalendar=Sun *-*-* 02:00:00

# Monthly on the 1st at 2 AM
OnCalendar=*-*-01 02:00:00
```

After editing, reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart fourmore-osm-update.timer
```

## Troubleshooting

### Timer isn't running

```bash
# Check if timer is enabled
systemctl is-enabled fourmore-osm-update.timer

# Check if timer is active
systemctl is-active fourmore-osm-update.timer

# View detailed timer info
systemctl show fourmore-osm-update.timer
```

### Service fails

```bash
# View detailed error logs
journalctl -u fourmore-osm-update.service -n 50 --no-pager

# Check if Docker is running
systemctl status docker

# Test the make command manually
cd /path/to/fourmore
make db-update
```

### Permission issues

Make sure:
- The user in the service file has permission to run Docker
- The user is in the `docker` group: `sudo usermod -aG docker YOUR_USERNAME`
- The working directory is readable by the user
- Environment files are readable by the user

## Disabling

To temporarily stop updates:

```bash
# Stop the timer
sudo systemctl stop fourmore-osm-update.timer

# Disable from starting on boot
sudo systemctl disable fourmore-osm-update.timer
```

To completely remove:

```bash
# Stop and disable
sudo systemctl stop fourmore-osm-update.timer
sudo systemctl disable fourmore-osm-update.timer

# Remove files
sudo rm /etc/systemd/system/fourmore-osm-update.service
sudo rm /etc/systemd/system/fourmore-osm-update.timer

# Reload systemd
sudo systemctl daemon-reload
```

## Monitoring

Set up monitoring/alerting by checking the service exit status:

```bash
# Check if last run was successful
systemctl show fourmore-osm-update.service | grep ExecMainStatus

# Success = ExecMainStatus=0
# Failure = ExecMainStatus > 0
```

You can integrate this with monitoring tools like:
- Prometheus + node_exporter
- Nagios/Icinga
- Custom scripts that check `ExecMainStatus`

## Notes

- Updates only download changes since the last run (incremental)
- The `Persistent=true` setting ensures missed updates run on next boot
- `RandomizedDelaySec=30min` prevents all servers from updating at exact same time
- Resource limits prevent runaway processes from consuming all system resources
- The service runs as a oneshot, so it completes and exits after each run
