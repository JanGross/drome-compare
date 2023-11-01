require('dotenv').config();
const express = require('express')
const { SpotifyApi } = require("@spotify/web-api-ts-sdk");
const Subsonic = require('./subsonic.js');

const app = express()
const port = 3000

const itemsPerPage = 28;
const subsonicApi = new Subsonic(process.env.SUBSONIC_ENDPOINT, process.env.SUBSONIC_USER, process.env.SUBSONIC_PASS);
const domain = process.env.SUBSONIC_ENDPOINT.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[0];

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

function urlToID (url) {
    //https://open.spotify.com/playlist/2GBjRoOMS1Zhb0owyfKIzs?si=1d8dc4db4a494dfd
    let id = url.split('/').pop().split("?")[0];
    return id;
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
        let subQuery = encodeURIComponent(`${item.track.album.name} ${item.track.album.artists[0]?.name}`);
        let subSR = await subsonicApi.searchAlbums(subQuery);
        let subsonicAlbum = subSR?.album;
        if(Array.isArray(subsonicAlbum)) {
            let albumCollection = subsonicAlbum;
            subsonicAlbum = undefined;
            for (let i = 0; i < albumCollection.length; i++) {
                if(albumCollection[i].album.toLowerCase().startsWith(item.track.album.name.toLowerCase())) {
                    subsonicAlbum = albumCollection[i];
                }
            }
        }
        let icon = statusIcons.MISSING;
        if (subsonicAlbum) {
            icon = statusIcons.UNCONFIRMED;
            //Only exactl album name matches
            if (subsonicAlbum.name.toLowerCase() == item.track.album.name.toLowerCase()) {
                icon = statusIcons.CONFIRMED;
            }
            //More tracks on Spotify
            if(item.track.album.total_tracks > subsonicAlbum.songCount) {
                icon = statusIcons.TRACK_MISMATCH;
            }
        }

        console.log(`[${i+1}/${paginatedSet.items.length}] ${icon} - ${item.track.album.name} (${item.track.name})`);
        if(!results.some(el => el.albumID === item.track.album.id)) {
            results.push({
                icon: icon,
                name: item.track.name,
                image: item.track.album.images[0]?.url,
                albumArtist: item.track.album.artists[0].name,
                albumName: item.track.album.name,
                albumID: item.track.album.id,
                albumTotal: item.track.album.total_tracks,
                matched: subsonicAlbum
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

app.get('/coverArt.png', async (req, res) => {
    let cover = await subsonicApi.getCoverArt(req.query.id);
    res.end(Buffer.from(await cover.arrayBuffer(), 'binary'));
});

(async () => {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`)
    })
})();