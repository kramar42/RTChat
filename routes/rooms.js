
/*
 * ROOMS
 */

exports.list = function(req, res) {
	res.render('rooms.jade', {rooms: ['test']});
}

exports.room = function(req, res) {
	req.mongo.test.find().limit(10).sort({date: -1}).toArray(function(err, messages) {
		if (err) throw err;
		res.render('room.jade', {messages: messages});
	});
}

exports.post = function(req, res) {
	var message=req.body.message;
	if (message) {
		req.mongo.test.insert({message: message, date: new Date()});
	}
	res.redirect('#');
}
