# Testing OSM Integration - MVP

## Setup Steps

### 1. Run Database Migration
```bash
docker exec -i fourmore-postgres-1 psql -U fourmore -d fourmore < scripts/add-osm-fields.sql
```

### 2. Update OSM OAuth Application
1. Go to https://www.openstreetmap.org/oauth2/applications
2. Edit your FourMore application
3. **Update scopes to:** `read_prefs write_api`
4. Save changes

### 3. Re-authenticate
- Users need to log out and log back in to get the new `write_api` scope
- This will store the OSM access token

## Testing the Confirm Flow

### Manual Test:
1. Start the app: `./scripts/start-dev.sh`
2. Navigate to http://localhost:3000
3. Log in with OSM (you'll be prompted for write_api permission)
4. Find a nearby place
5. Check in to the place
6. On success page, click "Confirm Info is Correct"
7. Should see success message

### What Happens:
- Backend fetches current OSM data for the POI (node or way)
- Creates a changeset with comment: "Confirmed POI information via FourMore check-in"
- Updates the element with `check_date=YYYY-MM-DD`
- Closes the changeset
- Returns success

### Verify on OSM:
1. Note the changeset ID from the response
2. Visit: https://www.openstreetmap.org/changeset/{changeset_id}
3. Should see your edit with check_date tag

## Common Issues

### 401 Unauthorized
- User needs to re-authenticate with new write_api scope
- Check that OSM OAuth app has write_api enabled

### 404 Not Found
- OSM element may have been deleted
- osm_id in database doesn't match current OSM

### 409 Conflict
- OSM element version changed since we fetched it
- Need to re-fetch and try again (not implemented in MVP)

## Next Steps (Option 4 - Quick Tags)

After confirming this works, we can add:
- WiFi available? [Yes/No]
- Wheelchair accessible? [Yes/No]
- Outdoor seating? [Yes/No]

Each adds proper OSM tags with 1 tap.