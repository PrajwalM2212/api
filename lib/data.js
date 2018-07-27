/*

Lib for CRUD operations on a file

*/

// for working with paths
const path = require('path');
// for CRUD operations on filesystem
const fs = require('fs');
// for promisifying
const utils = require('util');
const helpers = require('./helpers');

const f_open = utils.promisify(fs.open);
const f_write = utils.promisify(fs.write);
const f_close = utils.promisify(fs.close);
const f_readFile = utils.promisify(fs.readFile);

// create a new lib object that holds all CRUD methods
const lib = new Object();


// const base_dir for storing
lib.baseDir = path.join(__dirname + '/../.data');


// create  a file
lib.create = (dir, file, data, callback) => {

    fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'wx', (err, fd) => {

        if (!err && fd) {

            fs.write(fd, JSON.stringify(data), err => {
                if (!err) {

                    fs.close(fd, err => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback(`Error while closing file : ${err.stack}`)
                        }
                    })

                } else {
                    callback(`Error while writing to file : ${err.stack}`)
                }
            })

        } else {
            callback(`Error while opening file : ${err.stack}`)
        }
    })

}

// read a file
lib.read = (dir, file, callback) => {


    fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf8', (err, data) => {

        if (!err) {
            callback(null, helpers.toJSON(data))
        } else {
            callback(`Error while reading file : ${err.stack}`,null);
        }

    })


}

// update a file
lib.update = (dir, file, data, callback) => {
    fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', (err, fd) => {
        if (!err && fd) {

            fs.truncate(`${lib.baseDir}/${dir}/${file}.json`, err => {
                if (!err) {

                    fs.writeFile(fd, JSON.stringify(data), (err) => {
                        if (!err) {

                            fs.close(fd, err => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback(`Error while closing file : ${err.stack}`);
                                }
                            })

                        } else {
                            callback(`Error while writing file : ${err.stack}`);
                        }
                    })
                } else {
                    callback(`Error while truncating file : ${err.stack}`);
                }
            })

        } else {
            callback(`Error while opening file : ${err.stack}`);
        }
    })
}

// delete a file
lib.delete = (dir, file, callback) => {

    fs.unlink(`${lib.baseDir}/${dir}/${file}.json`, (err) => {

        if (!err) {
            callback(false);
        } else {
            callback("Error deleting file: " + err.stack);
        }

    });
}


// Export the lib
module.exports = lib;











/*
lib.read = async (dir, file) => {

    try {
        return await f_readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf8');
    } catch (err) {
        return err;
    }

}*/


/*
lib.create = (dir, file, data) => {

    if (!fs.existsSync(lib.baseDir + '/' + dir)) {
        fs.mkdirSync(lib.baseDir + '/' + dir);
    }

    f_open(lib.baseDir + '/' + dir + '/' + file + '.json', 'wx')
        .then(fd => {

            f_write(f, JSON.stringify(data));
            f_close(fd);

        })
        .catch(err => console.log("Error:" + err.stack));

}
*/

/*
lib.create = async (dir, file, data) => {

    if (!fs.existsSync(lib.baseDir + '/' + dir)) {
        fs.mkdirSync(lib.baseDir + '/' + dir);
    }

    let fileDescriptor;
    try {
        fileDescriptor = await f_open(lib.baseDir + '/' + dir + '/' + file + '.json', 'wx');
    } catch (err) {
        console.log("Error while opening the file " + err.stack);

    }

    try {
        await f_write(fileDescriptor, JSON.stringify(data));
    } catch (err) {
        console.log("Error while writing to file " + err.stack);
    }

    try {
        await f_close(fileDescriptor);
    } catch (err) {
        console.log("Error while closing file " + err.stack);
    }

}*/

/*
// Write data to a file
lib.create = function (dir, file, data, callback) {

    fs.mkdirSync(lib.baseDir + '/' + dir);

    // Open the file for writing
    fs.open(lib.baseDir + '/' + dir + '/' + file + '.json', 'wx', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            // Convert data to string
            var stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, function (err) {
                if (!err) {
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file:');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('Could not create new file, it may already exist');
        }
    });

};
*/