# Drome Compare  
Check backup completeness of Spotify playlists

## Configuration:
### Spotify   
Create a new app via https://developer.spotify.com/dashboard  
Once on the apps page, click settings in the upper right and copy your client ID / client secret

### Subsonic 
The Subsonic endpoint for Navidrone runs under /rest  
User and Pass are your Subsonic/Navidrome user

## Usage
Once configured, with all packages installed, run `node ./src/index.js`.  
The web interface can be accessed via http://localhost:3000

### Icons explained
✔️ Confirmed: The album name matched exactly  
❔ Unconfirmed: A search result was found, but the names do not match exactly  
⚠️ Track mismatch: The found album has more tracks on Spotify than in your backup  
❌ Missing: No matching album was found

### Cover image previews  
The squares display both cover images split diagonally.  
If you hover the Spotify or Navidrome icons, the respecitve cover will be shown exclusively.  
This is to make identifying both album more convenient.

ToDo:  
- Match by track instead of album
- Add album index to frontend
- Colored icons
- List filtering