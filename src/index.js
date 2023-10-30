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
    let purl = urlToID(req.query.playlist);
    let spotifyRes = await spotifyApi.playlists.getPlaylist(purl,market=undefined, fields= "name,tracks(total,items(track(album(name))))" );

    res.render('index', { purl: purl, spotifyRes: spotifyRes });
});

(async () => {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`)
    })
})();