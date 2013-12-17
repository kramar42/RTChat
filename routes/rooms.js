
/*
 * ROOMS
 */

var gethash = require('./hash').hash;

exports.list = function(req, res) {
	res.render('rooms.jade', {rooms: ['test']});
}

exports.room = function(req, res) {
	req.mongo.test.find().sort({date: -1}).limit(10).toArray(function(err, messages) {
		if (err) throw err;
        var hash = gethash(req);
        req.redis.hget(hash, 'name', function(err, name) {
            if (err) throw err;
            res.render('room.jade', {name: name, messages: messages});
        });
	});
}

exports.post = function(req, res) {
	var message = req.body.message;
    var hash = gethash(req);
	if (message) {
        req.redis.hget(hash, 'name', function(err, name) {
            if (err) throw err;
            req.mongo.test.insert({name: name, message: message,
                                   date: new Date()}, function(err, result) {
                if (err) throw err;
            });
        });
	}
	res.redirect('#');
}
