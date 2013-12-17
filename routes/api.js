
/*
 * API
 */

var gethash = require('./hash').hash;

exports.ping = function(req, res) {
    res.send('pong');
};

exports.login = function(req, res) {
    var hash = gethash(req);

    req.redis.exists(hash, function(err, exists) {
        if (err) throw err;
        if (exists) {
            res.send("you're already logged in");
        } else {
			req.redis.multi()
				.expire(hash, 60*30)
				.hmset(hash, {'name': req.params.username})
				.exec(function(err) {
					if (err) throw err;
					res.send('success');
			});
		}
	});
};

exports.me = function(req, res) {
    var hash = gethash(req);

    req.redis.multi()
		.expire(hash, 60*30)
		.hgetall(hash)
		.exec(function(err, results) {
			if (err) throw err;
			if (results[1] != undefined) {
				res.send(results[1]);
			} else {
				res.send("you're not logged in");
			}
		});
};

exports.users = function(req, res) {
	req.redis.keys('*', function(err, keys) {
		if (err) throw err;
		var multi = req.redis.multi();
		keys.forEach(function(key) {
			multi.hget(key, 'name');
		});
		multi.exec(function(err, results) {
			if (err) throw err;
			res.send(results);
		});
	});
}
