
/*
 * USERS
 */

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
