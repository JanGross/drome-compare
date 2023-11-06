require('dotenv').config();
const crypto = require('crypto');
const { XMLParser } = require('fast-xml-parser');

module.exports = class Subsonic {
    constructor(endpoint, user, pass) {
        this.endpoint = endpoint;
        this.user = user;
        this.salt = crypto.randomBytes(8).toString('hex');
        this.pwHash = crypto.createHash('md5').update(pass+this.salt).digest('hex');
    }

    async apiRequest(method, additionalArgs=undefined) {
        let url = [this.endpoint,`/${method}?u=${this.user}&t=${this.pwHash}&s=${this.salt}&c=drome-compare&v=1.13.0&`, additionalArgs].join('');
        let res = await fetch(url);
        
        //getCoverArt returns binary, no xml parsing needed.
        if( method === 'getCoverArt') {
            return res.blob(); 
        }

        const options = {
            ignoreAttributes : false,
            attributeNamePrefix: ''
        };
        const parser = new XMLParser(options);
        let xml = await res.text();
        const result = parser.parse(xml);

        switch (method) {
            case 'search3':
                return { xml: xml, result: result["subsonic-response"]["searchResult3"] };
                break;
            case 'getAlbum':
                return result["subsonic-response"]["album"];
                break;
            default:
                return result;
                break;
        }
        
    }
    async ping() {
        let res = await this.apiRequest("ping");
        return res;
    }

    async searchItems(query) {
        let params = `query=${query}&artistCount=0`;
        let res = await this.apiRequest("search3", params);
        return res.result;
    }

    async getAlbum(albumId) {
        let res = await this.apiRequest('getAlbum', `id=${albumId}`);
        res.album = res.name; //Map album name to album property for consistency
        return res;
    }

    async getCoverArt(coverID) {
        let res = this.apiRequest('getCoverArt', `id=${coverID}`);
        return res;
    }
}