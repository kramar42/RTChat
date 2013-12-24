var GOOGLE_APP_ID = '679216768366-eqs4cvu2scd9bm4bjahmsn1mesv428g7.apps.googleusercontent.com',
    GOOGLE_APP_SECRET = 'W9dxaEJrBCG3dM1NAimLMRxU';

exports.google = function(req, res) {
    res.redirect("https://accounts.google.com/o/oauth2/auth?scope=email&" +
        "response_type=code&client_id=" + GOOGLE_APP_ID +
        "&redirect_uri=http%3A%2F%2Frtchat.dit.in.ua%3A8085%2Foauth2%2Fgoogle%2Fauth");
};

exports.google_auth = function(req, res) {
    var code = req.param('code');
    var url = 'https://accounts.google.com/o/oauth2/token';
    var form = {client_id:GOOGLE_APP_ID, client_secret:GOOGLE_APP_SECRET,
        code:code, redirect_uri:'http://rtchat.dit.in.ua:8085/oauth2/google/auth',
        grant_type:'authorization_code'};

    request.post({url:url, form:form}, function(error, response, body) {
        var token = JSON.parse(body)['access_token'];
        request.get('https://www.googleapis.com/userinfo/email?alt=json&access_token=' + token,
            function(err, response, body) {
                var resp = JSON.parse(body)['data'];
                app.login(req, res, resp['email']);
            });
    });
};

