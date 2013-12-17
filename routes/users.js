
/*
 * USERS
 */

var gethash = require('./hash').hash;

exports.list = function(req, res) {
	req.redis.keys('*', function(err, keys) {
		if (err) throw err;
		var multi = req.redis.multi();
		keys.forEach(function(key) {
			multi.hget(key, 'name');
		});
		multi.exec(function(err, usernames) {
			if (err) throw err;
			console.log(usernames);
			res.render('users.jade', {keys: keys, usernames: usernames});
		});
	});
}

exports.user = function(req, res) {
	req.redis.hgetall(req.params.id, function(err, result) {
		if (err) throw err;
		res.send(result);
	});
}

exports.login = function(req, res) {
    var hash = gethash(req);

    req.redis.exists(hash, function(err, exists) {
        if (err) throw err;
        if (exists) res.redirect('/');
        else {
            res.render('login.jade');
        }
    });
}

exports.loginp = function(req, res) {
    var hash = gethash(req);
    var name = req.body.name;

    req.redis.exists(hash, function(err, exists) {
        if (err) throw err;
        if (exists) res.redirect('/');
        else {
            if (!name) res.redirect('#');
			req.redis.multi()
				.expire(hash, 60*30)
				.hmset(hash, {'name': req.body.name})
				.exec(function(err) {
					if (err) throw err;
					res.redirect('/');
			});
		}
	});
};
