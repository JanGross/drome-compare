# Drome Compare  
Scrappy tool to check backup completeness of Spotify playlists

## Configuration:
### Spotify   
Create a new app via https://developer.spotify.com/dashboard  
Once on the apps page, click settings in the upper right and copy your client ID / client secret

### Subsonic 
The Subsonic endpoint for Navidrone runs under /rest  
User and Pass are your Subsonic/Navidrome user

## Usage
Prepare the sqlite database: `node ./src/initDB.js`  
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
This is to make identifying both albums more convenient.  
![split_cover](https://github.com/JanGross/drome-compare/assets/13641301/eaa307aa-b4df-40a0-8b8d-41f6741bf076)


### Notes and overrides
Hovering over an album shows a tiny textbox. Text entered here (make sure to click the save button) will be visible when hovering the 📝 icon.  

The override menu can be opened by clicking the staus icon.  
Albums with an active override will have a highlited status corner. Currently unsetting / removing an override is not supported.
![image](https://github.com/JanGross/drome-compare/assets/13641301/141db27b-c5b7-49b4-bab7-e72abb17a0ed)


ToDo:  
- Add album index to frontend
- Colored icons
- List filtering
