/*
 * GET servers listing.
 */

exports.get = function(req, res) {
    req.mongo.servers.find().toArray(function(err, servers) {
        if (err) throw err;
        res.render('servers.jade', {servers: servers});
    });
};

exports.post = function(req, res) {
    var name = req.body.name,
        ip = req.body.ip;
    if (name && ip) {
        req.mongo.servers.insert({name:name, ip:ip, users: []}, function(err, resp) {
            if (err) {
                res.render('error.jade', {msg: 'Duplicated keys'});
            } else {
                res.redirect('.');
            }
        });
    } else {
        res.render('error.jade', {msg: 'Bad name or ip'});
    }
};

exports.view = function(req, res) {
    var name = req.params.server_name[0];
    req.mongo.servers.findOne({name: name}, function(err, server) {
        res.render('server.jade', {server: server});
    });
};
