
/*
 * API
 */

var xxhash = require('xxhash');

exports.ping = function(req, res) {
    res.send('pong');
};

exports.servers = function(req, res) {
    req.mongo.servers.find({}, {_id: false}).toArray(function(err, servers) {
        if (err) throw err;
        res.send(servers);
    });
};

exports.login = function(req, res) {
    var username = req.params.username,
        fingerprint = [req.header('host'), req.header('user-agent'), req.ip, username],
        fingerstring = fingerprint.join('*'),
        hash = xxhash.hash(new Buffer(fingerstring), 0x28a0bb24);

    req.redis.exists(hash, function(err, exists) {
        if (err) throw err;
        if (exists) {
            res.send("you're already logged in");
        } else {
            req.redis.set(hash, fingerstring, function(err) {
                if (err) throw err;
                res.send('success');
            });
        }
    });
};

exports.me = function(req, res) {
    var username = req.params.username,
        fingerprint = [req.header('host'), req.header('user-agent'), req.ip, username],
        fingerstring = fingerprint.join('*'),
        hash = xxhash.hash(new Buffer(fingerstring), 0x28a0bb24);

    req.redis.get(hash, function(err, fingerprint) {
        if (err) throw err;
        if (fingerprint != undefined) {
            res.send(fingerprint.split('*'));
        } else {
            res.send("you're not logged in");
        }
    });
};
