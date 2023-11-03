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

        switch (method) {
            case 'search3':
                let xml = await res.text();
                const options = {
                    ignoreAttributes : false,
                    attributeNamePrefix: ''
                };
                const parser = new XMLParser(options);
                const result = parser.parse(xml);
                return { xml: xml, result: result["subsonic-response"] };
                break;
            case 'getCoverArt':
                return res.blob();
                break;
            default:
                break;
        }
        
    }
    async ping() {
        let res = await this.apiRequest("ping");
        return res;
    }

    async searchAlbums(query) {
        let params = `query=${query}&songCount=0&artistCount=0`;
        let res = await this.apiRequest("search3", params);
        return res.result["searchResult3"];
    }

    async getCoverArt(coverID) {
        let res = this.apiRequest('getCoverArt', `id=${coverID}`);
        return res;
    }
}