# FourMore

I have been a Swarm (née Foursquare) user since 2011. I love to go back in time and see places I have visited.

I also love OpenStreetMap, it's the best map of the world, but more than anything else, it's an amazing community of mapmakers.

So this project is an effort to bring the two together. A private & non-social check-in app that uses OSM as its source for points of interest to look up, and encourages users to add information to OSM while they are out and about. It also has a "life log" that lets you go back in time. It requires OSM sign in through OAuth2. 

Eventually perhaps mobile apps? Expo / React native? I know nothing about this stuff

You can access the mvp at https://fourmore.osm.lol/

Please do report ideas and bugs and help out if you can

## Private Beta / Account Whitelisting

FourMore supports restricting access to specific OSM accounts for private beta testing. When enabled, users not on the whitelist will see a message directing them to contact you for access.

To enable whitelisting, set one or both of these environment variables in your `.env.local`:

```bash
# Whitelist by OSM username (case-insensitive, comma-separated)
OSM_ALLOWED_USERNAMES=alice,bob,charlie

# Whitelist by OSM user ID (comma-separated)
OSM_ALLOWED_USER_IDS=123456,789012,345678
```

When both variables are empty, all OSM users can sign in. When either is set, only users matching the criteria can access the app. Non-whitelisted users will see a modal with a mailto link to `mvexel@gmail.com` (configurable in the frontend).

Cheers
Martijn


Note on coding: I suck at front end / react so I had a lot of help from Claude Code for that part. I think that's fine, but the result is a little boring looking.