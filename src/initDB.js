const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database (or create if it doesn't exist)
const db = new sqlite3.Database('./db/compare.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

/**
 * 0 Missing
 * 1 Unconfirmed
 * 2 Mismatch
 * 3 Confirmed
 */
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS albums (
    albumID TEXT PRIMARY KEY,
    status INTEGER NOT NULL,
    comment TEXT
  );`;

console.log("Creating Albums Table")
db.run(createTableSQL, (err) => {
    if (err) {
        console.error('Error creating table', err.message);
    } else {
        console.log('Table created or already exists.');
    }
});

db.close((err) => {
    if (err) {
        console.error('Error closing database', err.message);
    } else {
        console.log('Database connection closed.');
    }
});