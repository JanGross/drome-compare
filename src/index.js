const express = require('express')

const app = express()
const port = 3000

app.set('view engine', 'ejs');
app.set('views', './src/views');

app.get('/', (req, res) => {
    let purl = req.query.playlist;
    res.render('index', { purl: purl });
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})