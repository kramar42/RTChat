var CLEF_APP_ID = '5f0c97b3ac2fe0f8c7ffedcf058140fe',
    CLEF_APP_SECRET = 'd7c79d9885e3beba070c18669591955a';

exports.clef = function(req, res) {
    var code = req.param('code');
    var url = 'https://clef.io/api/v1/authorize';
    var form = {app_id:CLEF_APP_ID, app_secret:CLEF_APP_SECRET, code:code};

    request.post({url:url, form:form}, function(error, response, body) {
        var token = JSON.parse(body)['access_token'];
        request.get('https://clef.io/api/v1/info?access_token=' + token,
            function(error, response, body) {
                var resp = JSON.parse(body)['info'];
                app.login(resp['email']);
            });
    });
};

exports.clef_logout = function(req, res) {
    var url = "https://clef.io/api/v1/logout";
    var logout_token = req.body['logout_token'];
    if (logout_token) {
        console.log(logout_token);
        form = {logout_token:logout_token,app_id:CLEF_APP_ID,app_secret:CLEF_APP_SECRET};
        request.post({url:url, form:form}, function(err, response, body) {
            console.log(JSON.parse(body)['clef_id']);
            res.send('ok');
        });
    }
};

