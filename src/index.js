require('dotenv').config();
const path = require('path');
const express = require('express');
const { SpotifyApi, ConsoleLoggingErrorHandler } = require("@spotify/web-api-ts-sdk");
const Subsonic = require('./subsonic.js');
const LocalDB = require('./localdb.js');

const app = express()
const port = 3000

const itemsPerPage = 28;
const subsonicApi = new Subsonic(process.env.SUBSONIC_ENDPOINT, process.env.SUBSONIC_USER, process.env.SUBSONIC_PASS);
const domain = process.env.SUBSONIC_ENDPOINT.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[0];
const db = new LocalDB("./db/compare.db");

const statusIcons = {
    MISSING: '❌',
    UNCONFIRMED: '❔',
    TRACK_MISMATCH: '⚠️',
    CONFIRMED: '✔️',
}

const spotifyApi = SpotifyApi.withClientCredentials(
    process.env.SPOTIFY_CLIENT_ID,
    process.env.SPOTIFY_CLIENT_SECRET
);

app.set('view engine', 'ejs');
app.set('views', './src/views');
app.use(express.json());

app.use('/static', express.static(path.join(__dirname, 'static')));
function urlToID (url) {
    //https://open.spotify.com/playlist/2GBjRoOMS1Zhb0owyfKIzs?si=1d8dc4db4a494dfd
    let id = url.split('/').pop().split("?")[0];
    return id;
}

function sanitizeString(input) {
    return input.replace(/[:"']/g,'');
}

function computeStringOverlapPercent(strA, strB) {
    let matches = 0;
    for (let index = 0; index < strA.length; index++) {
        if(strA[index] == strB[index]) {
            matches++;
        } else {
            break;
        }
        
    }
    return (matches / strA.length) * 100
}

function matchingTitles(subsonicTitle, spotifyTitle, strict=false) {
    subsonicTitle = sanitizeString(subsonicTitle).toLowerCase();
    spotifyTitle = sanitizeString(spotifyTitle).toLowerCase();

    if (!strict) {
        //Cases where album versions are appended (deluxe / extended edition etc.)
        if (subsonicTitle.startsWith(spotifyTitle)){
            return true;
        }

        //Sometimes spellings such as Part / Pt. are different. However, if the string matches up to 50% we can soft-match.
        let overlapPercent = computeStringOverlapPercent(subsonicTitle, spotifyTitle);
        if(overlapPercent > 50) {
            return true;
        }

        return false;
    }

    return subsonicTitle == spotifyTitle;
}

async function searchAndMatch(track, iteration=0) {
    let albumName = track.album.name;
    let trackName = track.name;
    let artistName = track.album.artists[0]?.name; 
    if(!artistName) { debugger }

    let searchTerm = ''; 
    switch (iteration) {
        case 0:
            searchTerm = sanitizeString(`${albumName} ${artistName}`);
            break;
        case 1:
            //Back off and try search without artist name
            searchTerm = sanitizeString(`${albumName}`);
            break;
        case 2:
            //No direct album match, try matching by song name instead
            searchTerm = sanitizeString(`${trackName} ${artistName}`);
            break;
        case 3:
            //Last try, song name without artist
            searchTerm = sanitizeString(`${trackName}`);
            break;

        default:
            //No match after all
            return undefined;
    }
    
    let subQuery = encodeURIComponent(searchTerm);
    let subSR = await subsonicApi.searchItems(subQuery);

    
    
    let result = [];
    if(subSR.album) result = Array.isArray(subSR.album) ? subSR.album : [subSR.album];
    if(subSR.song)  result = [...result, ...(Array.isArray(subSR.song) ? subSR.song : [subSR.song])];
    
    if (!subSR) {
        return await searchAndMatch(track, iteration+1)
    }

    if(Array.isArray(result)) {
        let collection = result;
        subsonicAlbum = undefined;
        for (let i = 0; i < collection.length; i++) {
            if (!collection[i]) { continue }
            let subsonicName = collection[i].album;
            let spotifyName = albumName;
            if(matchingTitles(subsonicName, spotifyName)) {
                subsonicAlbum = collection[i].albumId ? await subsonicApi.getAlbum(collection[i].albumId) : collection[i]; //If no albumId is present, it alreaady is an album
                if(matchingTitles(subsonicName, spotifyName, strict=true)) break;
            }
        }
        result = subsonicAlbum;
    }

    return result;
}

function mapSymbol(i) {
    switch (i) {
        case 0:
            return icon = statusIcons.MISSING;
        case 1:
            return icon = statusIcons.UNCONFIRMED;
        case 2:
            return icon = statusIcons.TRACK_MISMATCH;
        case 3:
            return icon = statusIcons.CONFIRMED;
        default:
            return -1;
    }
}

app.get('/', async (req, res) => {
    if(!req.query.playlist) { res.render('index'); return }
    let pid = urlToID(req.query.playlist);
    let page = parseInt(req.query.page);
    console.log(`Requested page ${page} for ${pid}`);
    let spotifyRes = await spotifyApi.playlists.getPlaylist(pid,market=undefined,fields="name,tracks(total)");
    console.log(`Fetching ${spotifyRes.name}`);
    let paginatedSet = await spotifyApi.playlists.getPlaylistItems(pid,market=undefined,fields="items(track(name,album(name,id,artists,total_tracks,images)))",itemsPerPage,(page-1) * itemsPerPage);
    console.log(`Fetched page ${page} at offset ${itemsPerPage * (page-1)} of ${spotifyRes.tracks.total} tracks`);

    results = [];
    let unconfirmed = 0;
    let confirmed = 0;
    let mismatch = 0;
    for (const [i, item] of paginatedSet.items.entries()) {
        let dbEntry = await db.GetAlbumByUID(item.track.album.id);
        let subsonicAlbum = await searchAndMatch(item.track);
       
        let icon = statusIcons.MISSING;
        if (subsonicAlbum) {
            icon = statusIcons.UNCONFIRMED;
            //Only exactl album name matches
            if (matchingTitles(subsonicAlbum.album, item.track.album.name, strict=true)) {
                icon = statusIcons.CONFIRMED;
            }
            //More tracks on Spotify
            if(item.track.album.total_tracks > subsonicAlbum.songCount) {
                icon = statusIcons.TRACK_MISMATCH;
            }
        }

        let dbOverride = false;
        if(dbEntry) {
            dbOverride = true;
            icon = mapSymbol(dbEntry.status);
        }
        
        console.log(`[${i+1}/${paginatedSet.items.length}] ${icon} - ${item.track.album.name} (${item.track.name})`);
        if(!results.some(el => el.albumID === item.track.album.id)) {
            results.push({
                override: dbOverride,
                icon: icon,
                name: item.track.name,
                image: item.track.album.images[0]?.url,
                albumArtist: item.track.album.artists[0].name,
                albumName: item.track.album.name,
                albumID: item.track.album.id,
                albumTotal: item.track.album.total_tracks,
                matched: subsonicAlbum,
            });

            switch (icon) {
                case statusIcons.CONFIRMED:
                    confirmed++;
                    break;
                case statusIcons.UNCONFIRMED:
                    unconfirmed++;
                    break;
                case statusIcons.TRACK_MISMATCH:
                    mismatch++;
                    break;
                default:
                    break;
            }
        }
    };
    res.render('index', {
        domain: domain,
        purl: req.query.playlist, 
        spotifyRes: spotifyRes, results: results, 
        playlistName: spotifyRes.name, 
        currentPage: page,  
        itemsPerPage: itemsPerPage,
        totalTracks: spotifyRes.tracks.total, 
        confirmedCount: confirmed,
        unconfirmedCount: unconfirmed,
        mismatchCount: mismatch,
        missingCount: results.length - (confirmed + unconfirmed + mismatch)
     });
});

app.post('/overrideStatus', async (req, res) => {
    const albumID = req.body.albumID;
    const status = req.body.status;
    console.log(`Received Status Override fr ${albumID} -> ${status}`);
    if (status === "unset") {
        console.warn("Unset not implemented!");
        return;
    }

    let result = await db.InsertOrUpdateAlbum(albumID, status);
    result.symbol = mapSymbol(result.status)
    res.json(JSON.stringify({ result: result }));
});

app.get('/coverArt.png', async (req, res) => {
    let cover = await subsonicApi.getCoverArt(req.query.id);
    res.end(Buffer.from(await cover.arrayBuffer(), 'binary'));
});


(async () => {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`)
    })
})();