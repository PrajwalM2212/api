/*

Handler methods 

*/

// Dependencies 

const _data = require('./data');
const helpers = require('./helpers');
const config = require('./../config');


// Handler object
const handlers = new Object();

// handling ping route
handlers.ping = (reqData, callback) => { callback(200); };

// handling notFound route
handlers.notFound = (reqData, callback) => { callback(404); }

// habdling the users route 

handlers.users = (reqData, callback) => {

    const acceptedMethods = ['get', 'post', 'put', 'delete'];

    if (acceptedMethods.indexOf(reqData.method) !== -1) {


        handlers._users[reqData.method](reqData, callback);


    } else {
        callback(405);
    }


}


handlers.tokens = (reqData, callback) => {


    const acceptedMethods = ['get', 'put', 'post', 'delete'];


    if (acceptedMethods.indexOf(reqData.method) !== -1) {

        handlers._tokens[reqData.method](reqData, callback);

    } else {

        callback(405);
    }


}

handlers.checks = (reqData, callback) => {

    const acceptedMethods = ['get', 'put', 'post', 'delete'];

    if (acceptedMethods.indexOf(reqData.method) !== -1) {

        handlers._checks[reqData.method](reqData, callback);

    } else {

        callback(405);

    }

}



// ------------------------------------------------Users----------------------------------------------

handlers._users = new Object();

// required fields : firstName,lastName,phone,password,tosAgreement
handlers._users.post = (reqData, callback) => {


    // get the request payload
    const payload = reqData.payload;

    // perform sanity checks
    let firstName = typeof (payload.firstName) === "string" && payload.firstName.trim().length > 0 ? payload.firstName : null;
    let lastName = typeof (payload.lastName) === "string" && payload.lastName.trim().length > 0 ? payload.lastName : null;
    let phone = typeof (payload.phone) === "string" && payload.phone.trim().length === 10 ? payload.phone : null;
    let password = typeof (payload.password) === "string" && payload.password.trim().length > 0 ? payload.password : null;
    let tosAgreement = typeof (payload.tosAgreement) === "boolean" && payload.tosAgreement === true ? true : false;

    // on passing sanity checks
    if (firstName !== null && lastName !== null && phone !== null && password !== null && tosAgreement !== false) {

        // check if user already exists
        _data.read('users', phone, (err, data) => {
            // requested user does not exist
            if (err !== null) {


                //get the hashed password
                const hashedPassword = helpers.hash(password);

                // sanity check the hashed pasword
                if (hashedPassword !== null) {


                    // create user object
                    const user = {

                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'password': hashedPassword,
                        'tosAgreement': true,

                    }


                    // create a user file
                    _data.create('users', phone, user, err => {

                        if (err === false) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, { 'error': 'Error creating user' })
                        }

                    });


                } else {

                    // hasing failed
                    callback(500, { 'error': 'Error hashing users password' });

                }
            } else {
                // user already exists
                callback(400, { 'error': 'User already exists' });
            }
        });

    } else {

        // sanity check failed
        callback(400, { 'error': 'Missing required fields' });

    }

}


// handler for get request on the users route
// authenticate the user using tokens
handlers._users.get = (reqData, callback) => {

    // get the phone from query string object
    const phone = reqData.query.phone;

    // sanity check the phone number
    if (typeof (phone) === 'string' && phone.trim().length === 10) {

        const token = reqData.headers.token;

        // verify if token and phone match
        handlers._tokens.verify(token, phone, isTokenValid => {

            // if authentication is successfull
            if (isTokenValid) {

                // read the user data
                _data.read('users', phone, (err, data) => {

                    // if user does not exist
                    if (err === null) {


                        // if user exists
                        delete data.password;
                        callback(200, data);



                    } else {

                        callback(404, { 'error': 'the user does not exist' });

                    }

                });


            } else {
                //  if authentication is not successfull

                callback(403, { 'error': 'token not present in header or the token has expired' })
            }

        });

    } else {

        callback(400, { 'error': 'Missing required query string' });
    }
    //
}


// handler for the put request on the user route 
// authenticate the user 
handlers._users.put = (reqData, callback) => {

    // get the request payload
    const payload = reqData.payload;
    const token = reqData.headers.token;


    // get all required fields from payload
    let firstName = typeof (payload.firstName) === "string" && payload.firstName.trim().length > 0 ? payload.firstName : null;
    let lastName = typeof (payload.lastName) === "string" && payload.lastName.trim().length > 0 ? payload.lastName : null;
    let phone = typeof (payload.phone) === "string" && payload.phone.trim().length === 10 ? payload.phone : null;
    let password = typeof (payload.password) === "string" && payload.password.trim().length > 0 ? payload.password : null;


    // sanity check the phone number
    if (phone !== null) {

        // check if required fields for updating exist
        if (firstName !== null || lastName !== null || password !== null) {


            // sanity check the token 
            handlers._tokens.verify(token, phone, (isTokenValid) => {


                // if token is valid
                if (isTokenValid) {

                    // check if the user exists and obtaint his data 
                    _data.read('users', phone, (err, data) => {
                        // the user exists 
                        if (err === null && data !== null) {

                            const user = data;

                            // update the requested fields
                            if (firstName !== null) {

                                user.firstName = firstName;

                            }

                            if (lastName !== null) {

                                user.lastName = lastName

                            }

                            if (password !== null) {
                                user.password = helpers.hash(password);
                            }

                            // update the user data
                            _data.update('users', phone, user, (err) => {

                                if (err === false) {

                                    // update done successfully
                                    callback(200);

                                } else {

                                    // update failed
                                    callback(500, { 'error': 'could not update the user' });

                                }

                            });

                        }
                        else {
                            // the user does not exist
                            callback(404, { 'error': 'the user does not exist' });
                        }
                    });


                } else {

                    // token verification failed 
                    callback(403, { 'error': 'token not present in header or the token has expired' })

                }

            });

        } else {

            // fields required for updating do not exist
            callback(400, { 'error': 'Missing required fields' });

        }

    } else {

        // phone number sanity check failed
        callback(400, { 'error': 'Missing phone field' });

    }

}

// handle delete request on the users route
handlers._users.delete = (reqData, callback) => {

    // get the phone from query
    const phone = reqData.query.phone;
    const token = reqData.headers.token;

    // sanity check on phone number 
    if (typeof (phone) === "string" && phone.trim().length === 10) {

        // token verification
        handlers._tokens.verify(token, phone, isTokenValid => {


            // token is verified 
            if (isTokenValid) {

                // check if user exits 
                _data.read('users', phone, (err, data) => {

                    if (err === null) {

                        // if user exists 

                        // delete the user
                        _data.delete('users', phone, err => {

                            // delete successfull
                            if (err === false) {
                                callback(200);

                            } else {
                                // delete failed
                                console.log(err);
                                callback(500, { 'error': 'could not delete the user' });
                            }

                        });

                    } else {

                        // user does not exist
                        callback(404, { 'error': 'the user does not exist' });

                    }

                });

            } else {

                // token verification failed 
                callback(403, { 'error': 'token not present in header or the token has expired' })

            }

        });

    } else {

        // phone number is wrong in query
        callback(400, { 'error': 'Missing required query string' });

    }

}


// ---------------------------------------Tokens-------------------------------------------------------

handlers._tokens = new Object();

// required fields : phone,id,expiration
handlers._tokens.post = (reqData, callback) => {


    // get the request payload
    const payload = reqData.payload;


    // get all required fields from payload
    let phone = typeof (payload.phone) === "string" && payload.phone.trim().length === 10 ? payload.phone : null;
    let password = typeof (payload.password) === "string" && payload.password.trim().length > 0 ? payload.password : null;


    if (phone !== null && password !== null) {


        _data.read('users', phone, (err, data) => {
            if (err === null) {

                const userData = data;

                if (userData.password === helpers.hash(password)) {


                    let tokenId;
                    helpers.createToken(10, (err, buffer) => {
                        if (err !== null) {

                            console.log(err);
                            callback(500, { 'error': 'Error creating tokenId' })

                        } else {

                            tokenId = buffer.toString('hex');



                            const expires = Date.now() + (1000 * 60 * 60);

                            const tokenObject = new Object({
                                expires,
                                tokenId,
                                phone,
                            });

                            _data.create('tokens', tokenId, tokenObject, err => {

                                if (!err) {

                                    callback(200, tokenObject);

                                } else {

                                    callback(500, { 'error': 'Error creating token' })
                                }

                            });


                        }
                    });


                } else {

                    callback(400, { 'error': 'Wrong password' })

                }
            } else {

                callback(400, { 'error': 'User doesnt exist' })


            }
        });

    } else {

        callback(400, { 'error': 'Missing required fields' })

    }


}


handlers._tokens.get = (reqData, callback) => {


    const tokenId = reqData.query.tokenId;

    if (typeof (tokenId) === "string" && tokenId.length === 20) {


        _data.read('tokens', tokenId, (err, tokenObject) => {


            if (err === null) {

                callback(200, tokenObject);


            } else {

                callback(404, { 'error': 'Token does not exist' })

            }

        });

    } else {

        callback(400, { 'error': 'Wrong or missing token Id' });
    }

}


handlers._tokens.put = (reqData, callback) => {


    const payload = reqData.payload;
    let tokenId = typeof (payload.tokenId) === "string" && payload.tokenId.trim().length === 20 ? payload.tokenId : null;
    let extend = typeof (payload.extend) === "boolean" && payload.extend === true ? true : false;

    console.log()

    if (tokenId !== null) {

        if (extend) {

            _data.read('tokens', tokenId, (err, tokenObject) => {

                if (err === null) {

                    if (tokenObject.expires > Date.now()) {

                        tokenObject.expires = tokenObject.expires + (1000 * 60 * 60);

                        _data.update('tokens', tokenId, tokenObject, err => {
                            if (!err) {
                                callback(200)
                            }
                            else {
                                callback(500, { 'error': 'could not update the fields' });
                            }
                        });

                    } else {

                        callback(400, { 'error': 'the token has already expired and cannot be extended' });


                    }

                } else {

                    callback(404, { 'error': 'Token does not exist' })

                }

            });

        } else {

            callback(400, { 'error': 'Missing required fields' });
        }

    } else {

        callback(400, { 'error': 'Missing tokenId' });

    }

}

// for deleting a token
handlers._tokens.delete = (reqData, callback) => {

    // get token id from qury string
    const tokenId = reqData.query.tokenId;

    // sanity check on token
    if (typeof (tokenId) === "string" && tokenId.length === 20) {

        // if sanity check passed 
        _data.read('tokens', tokenId, (err, tokenObject) => {

            // if the token exists delete it 

            if (err === null) {

                _data.delete('tokens', tokenId, err => {


                    if (!err) {

                        callback(200);

                    } else {

                        callback(500, { 'error': 'could not delete token' });

                    }

                });


            } else {

                // token does not exist
                callback(404, { 'error': 'Token does not exist' })

            }

        });

    } else {

        // token sanity check failed
        callback(400, { 'error': 'Wrong or missing token Id' });

    }

}


// helper method to verify the tokenId for authentication
handlers._tokens.verify = (tokenId, phone, callback) => {

    _data.read('tokens', tokenId, (err, tokenObject) => {

        if (err === null) {

            // if tokenObject exits and phone number matches return true or return false
            if (tokenObject.phone == phone && tokenObject.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }

        } else {
            callback(false);
        }
    });

}

//------------------------------------------Checks-------------------------------------------------------------



handlers._checks = new Object();

// handler for post request on checks route
handlers._checks.post = (reqData, callback) => {


    // get the payload from the requested data
    const payload = reqData.payload;

    //get all the required fields from the payload and check their values
    let protocol = typeof (payload.protocol) === "string" && ['http', 'https'].indexOf(payload.protocol) > -1 ? payload.protocol : false;
    let url = typeof (payload.url) === 'string' && payload.url.length > 0 ? payload.url : false;
    let method = typeof (payload.method) === "string" && ['get', 'put', 'post', 'delete'].indexOf(payload.method) > -1 ? payload.method : false;
    let successCodes = typeof (payload.successCodes) === "object" && payload.successCodes instanceof Array && payload.successCodes.length > 0 ? payload.successCodes : false;
    let timeoutSeconds = typeof (payload.timeoutSeconds) === "number" && payload.timeoutSeconds % 1 === 0 && payload.timeoutSeconds >= 1 ? payload.timeoutSeconds : false;


    if (protocol && url && method && successCodes && timeoutSeconds) {

        // get the token
        let token = typeof (reqData.headers.token) === 'string' && reqData.headers.token.length === 20 ? reqData.headers.token : false;
        console.log(reqData.headers.token);
        if (token) {

            // read the token file and get the phone
            _data.read('tokens', token, (err, tokenObj) => {

                if (err === null) {

                    const phone = tokenObj.phone;

                    _data.read('users', phone, (err, userData) => {

                        if (!err) {

                            let userChecks = typeof (userData.checks) === "object" && userData.checks instanceof Array ? userData.checks : [];

                            if (userChecks.length < config.maxChecks) {


                                // create  a checkId which is unique as a token
                                helpers.createToken(10, (err, buffer) => {

                                    if (!err) {

                                        const checkId = buffer.toString('hex');
                                        const checkObj = {
                                            checkId,
                                            phone,
                                            method,
                                            url,
                                            successCodes,
                                            protocol,
                                            timeoutSeconds
                                        }

                                        _data.create('checks', checkId, checkObj, err => {

                                            if (!err) {


                                                userData.checks = userChecks;
                                                userData.checks.push(checkId);

                                                _data.update('users', phone, userData, (err) => {

                                                    if (!err) {
                                                        callback(200, checkObj);
                                                    } else {
                                                        callback(500, { 'error': 'Could not update user with new check' })
                                                    }

                                                });


                                            } else {
                                                callback(500, { 'error': 'Could not create a check id' });
                                            }

                                        });

                                    } else {

                                        callback(500, { 'error': 'Could not create a check id' });
                                    }
                                })

                            } else {
                                callback(400, { 'error': 'The user already has maximum number of checks' });
                            }

                        } else {
                            callback(403, { 'error': 'could not get user data' });
                        }
                    });

                } else {

                    callback(403, { 'error': 'could not get token data' });

                }

            });

        } else {
            callback(403, { 'error': 'Invalid token' });
        }

    } else {
        callback(400, { 'error': 'missing required fields' });
    }


}


handlers._checks.get = (reqData, callback) => {

    // get the checkId from query string object
    const checkId = reqData.query.checkId;

    // sanity check the checkId number
    if (typeof (checkId) === 'string' && checkId.trim().length === 20) {

        _data.read('checks', checkId, (err, checkObj) => {

            if (!err && checkObj) {

                const token = reqData.headers.token;

                // verify if token and phone match
                handlers._tokens.verify(token, checkObj.phone, isTokenValid => {

                    // if authentication is successfull
                    if (isTokenValid) {

                        callback(200, checkObj);

                    } else {
                        //  if authentication is not successfull

                        callback(403, { 'error': 'token not present in header or the token has expired' })
                    }

                });


            } else {

                callback(404);

            }

        });

    } else {

        callback(400, { 'error': 'Missing required query string' });
    }

}

handlers._checks.put = (reqData, callback) => {
    // Required data: id
    // Optional data: protocol,url,method,successCodes,timeoutSeconds (one must be sent)
    // Check for required field
    var checkId = typeof (reqData.payload.checkId) == 'string' && reqData.payload.checkId.trim().length == 20 ? reqData.payload.checkId.trim() : false;

    // Check for optional fields
    var protocol = typeof (reqData.payload.protocol) == 'string' && ['https', 'http'].indexOf(reqData.payload.protocol) > -1 ? reqData.payload.protocol : false;
    var url = typeof (reqData.payload.url) == 'string' && reqData.payload.url.trim().length > 0 ? reqData.payload.url.trim() : false;
    var method = typeof (reqData.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(reqData.payload.method) > -1 ? reqData.payload.method : false;
    var successCodes = typeof (reqData.payload.successCodes) == 'object' && reqData.payload.successCodes instanceof Array && reqData.payload.successCodes.length > 0 ? reqData.payload.successCodes : false;
    var timeoutSeconds = typeof (reqData.payload.timeoutSeconds) == 'number' && reqData.payload.timeoutSeconds % 1 === 0 && reqData.payload.timeoutSeconds >= 1 && reqData.payload.timeoutSeconds <= 5 ? reqData.payload.timeoutSeconds : false;

    // Error if id is invalid
    if (checkId) {
        // Error if nothing is sent to update
        if (protocol || url || method || successCodes || timeoutSeconds) {
            // Lookup the check
            _data.read('checks', checkId, function (err, checkData) {
                if (!err && checkData) {
                    // Get the token that sent the request
                    var token = typeof (reqData.headers.token) == 'string' ? reqData.headers.token : false;
                    // Verify that the given token is valid and belongs to the user who created the check
                    handlers._tokens.verify(token, checkData.phone, function (tokenIsValid) {
                        if (tokenIsValid) {
                            // Update check data where necessary
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes;
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Store the new updates
                            _data.update('checks', checkId, checkData, function (err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, { 'Error': 'Could not update the check.' });
                                }
                            });
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Check ID did not exist.' });
                }
            });
        } else {
            callback(400, { 'Error': 'Missing fields to update.' });
        }
    } else {
        callback(400, { 'Error': 'Missing required field.' });
    }
}


handlers._checks.delete = (reqData, callback) => {


    // Check that id is valid
    var checkId = typeof (reqData.query.checkId) == 'string' && reqData.query.checkId.trim().length == 20 ? reqData.query.checkId.trim() : false;
    if (checkId) {
        // Lookup the check
        _data.read('checks', checkId, function (err, checkData) {
            if (!err && checkData) {
                // Get the token that sent the request
                var token = typeof (reqData.headers.token) == 'string' ? reqData.headers.token : false;
                // Verify that the given token is valid and belongs to the user who created the check
                console.log(token)
                handlers._tokens.verify(token, checkData.phone, function (tokenIsValid) {
                    if (tokenIsValid) {

                        // Delete the check data
                        _data.delete('checks', checkId, function (err) {
                            if (!err) {
                                // Lookup the user's object to get all their checks
                                _data.read('users', checkData.phone, function (err, userData) {
                                    if (!err) {
                                        var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        // Remove the deleted check from their list of checks
                                        var checkPosition = userChecks.indexOf(checkId);
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            // Re-save the user's data
                                            userData.checks = userChecks;
                                            _data.update('users', checkData.phone, userData, function (err) {
                                                if (!err) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { 'Error': 'Could not update the user.' });
                                                }
                                            });
                                        } else {
                                            callback(500, { "Error": "Could not find the check on the user's object, so could not remove it." });
                                        }
                                    } else {
                                        callback(500, { "Error": "Could not find the user who created the check, so could not remove the check from the list of checks on their user object." });
                                    }
                                });
                            } else {
                                callback(500, { "Error": "Could not delete the check data." })
                            }
                        });
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(400, { "Error": "The check ID specified could not be found" });
            }
        });
    } else {
        callback(400, { "Error": "Missing valid id" });
    }

}


// exporting the handlers object
module.exports = handlers;