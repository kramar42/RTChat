var crypto = require('crypto');

exports.login = function(req, res, email, next) {
    var session = crypto.createHash('sha1').update(email +
            new Date().getTime()).digest('hex');
    req.session.user = {email: email};
    req.redis.hset(email, 'session', session, function(err) {
        if (err) throw err;
        next(req, res);
        res.redirect('/');
    });
};

exports.session = function(req, res) {
    req.redis.hget(req.session.user.email, 'session', function(err, session) {
        if (err) throw err;
        res.send(session);
    });
};

exports.getfriends = function(req, res) {
    req.mongo.users.findOne({'email': req.session.user.email}, {'friends': true}, function(err, friends) {
        if (err) throw err;
        res.send(friends);
    });
};

exports.getonlinefriends = function(req, res) {
    req.mongo.users.findOne({'email': req.session.user.email}, {'_id': true}, function(err, friends) {
        if (err) throw err;
        var result = [];
        var multi = req.redis.multi();
        friends['friends'].forEach(function(friend) {
            multi.exists(friend, function(err, exists) {
                if (err) throw err;
                if (exists) result.push(friend);
            });
        });
        multi.exec(function(err, r) {
            if (err) throw err;
            res.send(result);
        });
    });
};

