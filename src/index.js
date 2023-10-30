require('dotenv').config();
const express = require('express')
const { SpotifyApi } = require("@spotify/web-api-ts-sdk");
const Subsonic = require('./subsonic.js');

const app = express()
const port = 3000

const subsonicApi = new Subsonic(process.env.SUBSONIC_ENDPOINT, process.env.SUBSONIC_USER, process.env.SUBSONIC_PASS);

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
    let purl = urlToID(req.query.playlist);
    let spotifyRes = await spotifyApi.playlists.getPlaylist(purl,market=undefined,fields="name,tracks(total,items(track(name,album(name,id,artists,total_tracks,images))))");
    console.log(`Fetched ${spotifyRes.tracks.items.length} of ${spotifyRes.tracks.total} tracks`);
    while (spotifyRes.tracks.items.length < spotifyRes.tracks.total - 1) {
        let nextSet = await spotifyApi.playlists.getPlaylistItems(purl,market=undefined,fields="items(track(name,album(name,id,artists,total_tracks,images)))",50,spotifyRes.tracks.items.length);
        spotifyRes.tracks.items.push(...nextSet.items);
        console.log(`Fetched ${spotifyRes.tracks.items.length} of ${spotifyRes.tracks.total} tracks`);
    }
    results = [];
    let matched = 0;
    for (const [i, item] of spotifyRes.tracks.items.entries()) {
        let subQuery = encodeURIComponent(`${item.track.album.name} ${item.track.album.artists[0]?.name}`);
        let subSR = await subsonicApi.searchAlbums(subQuery);
        let subsonicAlbum = subSR?.album;
        if(Array.isArray(subsonicAlbum)) {
            for (let i = 0; i < subsonicAlbum.length; i++) {
                if(subsonicAlbum[i].album.toLowerCase().startsWith(item.track.album.name.toLowerCase())) {
                    subsonicAlbum = subsonicAlbum[i];
                }
            }
        }
        let icon = '❌';
        if (subsonicAlbum) {
            matched++;
            icon = '❔';
            //Only exactl album name matches
            if (subsonicAlbum.name == item.track.album.name) {
                icon = '✔️';
            }
            //More tracks on Spotify
            if(item.track.album.total_tracks > subsonicAlbum.songCount) {
                icon = '⚠️';
            }
        }
        console.log(`[${i}/${spotifyRes.tracks.items.length}] ${icon} - ${item.track.album.name} (${item.track.name})`);
        if(!results.some(el => el.albumID === item.track.album.id)) {
            results.push({
                icon: icon,
                name: item.track.name,
                image: item.track.album.images[0]?.url,
                albumName: item.track.album.name,
                albumID: item.track.album.id,
                albumTotal: item.track.album.total_tracks,
                matched: subsonicAlbum
            });
        }
    };
    res.render('index', { purl: purl, spotifyRes: spotifyRes, results: results, playlistName: spotifyRes.name, totalTracks: spotifyRes.tracks.total, matchedCount: matched });
});

(async () => {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`)
    })
})();