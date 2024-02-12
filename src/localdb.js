const sqlite3 = require('sqlite3').verbose();


module.exports = class LocalDB {
    constructor(file) {
        this.db = new sqlite3.Database('./db/compare.db', (err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Connected to local db');
        });

        this.db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='albums'", (err, table) => {
            if (err) {
                console.error('Error checking if table exists', err.message);
                return;
            } 
            if (!table) {
                console.log('Required tables missing! Please run initDB first.');
            }
        });
    }

    GetAlbumByUID(albumID) {
        const query = "SELECT albumID, status, comment FROM albums WHERE albumID = ?";
        return new Promise((resolve, reject) => {
            this.db.get(query, [albumID], (err, row) => {
                if (err) {
                    console.error('Error fetching item', err.message);
                    reject(err);
                } else if (row) {
                    console.log('Album found in local DB:', row);
                    resolve(row);
                } else {
                    console.log('Album not found in local DB ' + albumID);
                    resolve(null);
                }
            });
        });
    }

    async InsertOrUpdateAlbum(albumID, status, comment = null) {
        const query = `
          INSERT INTO albums (albumID, status, comment) VALUES (?, ?, ?)
          ON CONFLICT(albumID) DO UPDATE SET
            status = excluded.status,
            comment = COALESCE(excluded.comment, comment);
        `;
      
        db.run(query, [albumID, status, comment], (err) => {
          if (err) {
            console.error('Error inserting or updating album', err.message);
          } else {
            console.log('Album inserted or updated successfully.');
          }
        });
      };
}