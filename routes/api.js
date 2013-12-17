
/*
 * API
 */

var xxhash = require('xxhash');

exports.ping = function(req, res) {
    res.send('pong');
};

exports.login = function(req, res) {
    var username = req.params.username,
        fingerprint = [req.header('host'), req.ip, username],
        fingerprint_s = fingerprint.join(''),
        hash = xxhash.hash(new Buffer(fingerprint_s), 0x28a0bb24);

    req.redis.exists(hash, function(err, exists) {
        if (err) throw err;
        if (exists) {
            res.send("you're already logged in");
        } else {
			req.redis.multi()
				.expire(hash, 60*30)
				.hmset(hash, {'host': fingerprint[0], 'ip': fingerprint[1],
							  'name': fingerprint[2]})
				.exec(function(err) {
					if (err) throw err;
					res.send('success');
			});
		}
	});
};

exports.me = function(req, res) {
    var username = req.params.username,
        fingerprint = [req.header('host'), req.ip, username],
        fingerprint_s = fingerprint.join(''),
        hash = xxhash.hash(new Buffer(fingerprint_s), 0x28a0bb24);

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
