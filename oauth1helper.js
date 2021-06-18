const crypto = require("crypto");
const oauth1a = require("oauth-1.0a");
const fs = require("fs");

class Oauth1Helper {

  constructor() {
    try {
      this.oauth = JSON.parse(fs.readFileSync('./token.json', 'utf8'));
    }
    catch (err) {
      if (err.code === 'ENOENT') {
        console.error("token.json not found. You would need it for authentication.");
      }
      else {
        throw err;
      }
    }
  }

  getAuthHeaderForRequest(request) {
    const oauth = oauth1a({
      consumer: { 
        key: this.oauth.consumer_key,
        secret: this.oauth.consumer_secret,
       },
      signature_method: "HMAC-SHA1",
      hash_function(base_string, key) {
        return crypto
          .createHmac("sha1", key)
          .update(base_string)
          .digest("base64");
      },
    });

    const authorization = oauth.authorize(request, {
      key: this.oauth.token,
      secret: this.oauth.token_secret,
    });

    return oauth.toHeader(authorization);
  }
}

module.exports = Oauth1Helper;
