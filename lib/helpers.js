

const crypto = require('crypto');
const config = require('./../config');

const helpers = new Object();

// generate hash for a password
helpers.hash = (str) => {

    if (typeof (str) === 'string' && str.trim().length > 0) {

        const hash = crypto.createHmac('sha256', config.secret).update(str).digest('hex');

        return hash;

    } else {

        return null;

    }

}

// convert string to json object
helpers.toJSON = (str) => {

    try {
        const obj = JSON.parse(str);
        return obj;
    } catch (err) {

        return {};
    }

}

// generate tokens 

helpers.createToken = (byteLength, callback) => {
    crypto.randomBytes(byteLength, (err, buffer) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, buffer);
        }
    });
}

module.exports = helpers;