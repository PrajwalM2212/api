/*

Handler methods 

*/

// Dependencies 

const _data = require('./data');
const helpers = require('./helpers');


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

                                    callback(200)

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














// exporting the handlers object
module.exports = handlers;