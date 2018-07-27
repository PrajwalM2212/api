console.log("hare krishna");

/*

Primary File for the application


*/

// to create a server we need core http module from the nodejs api
// to manipulate and get required data from url use url core module
// to decode buffers as strings get the String Decoder core module
// get the environment from config.js

const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const env = require('./config');
const https = require('https');
const fs = require('fs');
const data = require('./lib/data');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');


// create a httpServer 

const httpServer = http.createServer((req, res) => unifiedServer(req, res));


// Start httpServer 

httpServer.listen(env.httpPort, () => console.log(`Sever running on port ${env.httpPort} in ${env.envName} mode`));


// create httpsServer 

const httpsServerOptions = new Object({

    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem'),

});

httpsServer = https.createServer(httpsServerOptions, (req, res) => unifiedServer(req, res));


// Start httpsServer 
httpsServer.listen(env.httpsPort, () => console.log(`Sever running on port ${env.httpsPort} in ${env.envName} mode`));


data.read('test', 'newFile', (err, data) => {
    if (!err) {
        console.log(data);
    }
});


// Router to handle http requests
const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
}


// Common function for both the servers 
const unifiedServer = (req, res) => {


    // parse the req to get the full url including query strings;
    const parsedUrl = url.parse(req.url, true);

    // get the pathname from the parsed url
    const pathname = parsedUrl.pathname;

    // get path removed of all unnecessary slashes
    const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');

    // get the request method
    const method = req.method.toLowerCase();

    // get the query which is returned as an object
    const queryObject = parsedUrl.query;

    // get the request headers
    const headers = req.headers;


    /*

    Put simply :

    1. Payload : It is the data sent by a post or put request
    2. Stream : It is a sequence of objects accessed in a sequential order
    3. Buffer : Chunks of objects thrown by streams
    4. String Decoder: Used to convert buffer to strings

    // All have excellent descriptions on Stack Overflow

    */

    // Get payload 

    // decode as a utf-8
    // decoder has write and end methods which can be learnt in the docs
    const decoder = new StringDecoder('utf-8');
    // on the data event. It is of type ReadableStream. The chunk emitted in each 'data' event is a Buffer
    let decodedString = ''
    // handle errors as they can bring down entire app
    req.on('error', err => console.log("Error:" + err.stack));
    req.on('data', (chunk) => {
        decodedString += decoder.write(chunk);
    }).on('end', () => {
        // get the last chuck of data
        decodedString += decoder.end();

        // get the handler based on request
        const reqHandler = (typeof router[trimmedPath] !== "undefined") ? router[trimmedPath] : handlers.notFound;

        // create a object holding required request data
        const reqData = {
            'method': method,
            'trimmedPath': trimmedPath,
            'query': queryObject,
            'headers': headers,
            'payload': helpers.toJSON(decodedString)
        }


        // respond to the request with statusCode and resPayload
        reqHandler(reqData, (statusCode, resPayload) => {

            // confirm status code
            statusCode = typeof (statusCode) === "number" ? statusCode : 200;
            // confirm response payload
            resPayload = typeof (resPayload) === "object" ? resPayload : {}

            // stringify the response payload
            resPayloadString = JSON.stringify(resPayload);

            // write the response header
            res.writeHead(statusCode, {
                'content-type': 'application/json'
            });
            // write the stringified payload 
            res.write(resPayloadString);
            // finish the response
            res.end();

        })


    })


}
