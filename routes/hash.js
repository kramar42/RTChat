
var xxhash = require('xxhash');

exports.hash = function(req) {
    var fingerprint = [req.header('accept'), req.header('user-agent'),
                       req.header('accept-encoding'), req.header('accept-language')];
    return xxhash.hash(new Buffer(fingerprint.join('')), 0x28a0bb24);
}
