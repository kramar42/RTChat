/*
 * GET servers listing.
 */

exports.get = function(req, res) {
    req.mongo.servers.find().toArray(function(err, servers) {
        if (err) throw err;
        res.render('server.jade', {vars: {servers: servers}});
    });
};

exports.post = function(req, res) {
    var name = req.body.name,
        ip = req.body.ip;
    if (name && ip) {
        req.mongo.servers.insert({name:name, ip:ip, users: []}, function(err, resp) {
            if (err) {
                res.render('error.jade', {msg: err});
            } else {
                res.redirect('.');
            }
        });
    } else {
        res.render('error.jade', {msg: 'Bad name or ip'});
    }
};
