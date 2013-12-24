
/**
 * Module dependencies.
 */

var express = require('express')
, http = require('http')
, path = require('path')
, url = require('url')
, request = require('request')

, api = require('./routes/api')
, users = require('./routes/users')
, rooms = require('./routes/rooms')

, redis = require('redis')
, mongo_client = require('mongodb').MongoClient;

var app = express();

app.configure(function() {
    var redis_url, redis_client;
    if (process.env.REDISCLOUD_URL) {
        redis_url = url.parse(process.env.REDISCLOUD_URL);
        redis_client = redis.createClient(redis_url.port, redis_url.hostname,
            {no_ready_check: true});
        redis_client.auth(redis_url.auth.split(":")[1]);
    } else {
        redis_client = redis.createClient('6379');
    }

    //on redis error
    redis_client.on('error', function (err) {
        console.log('Redis error ' + err);
    });

    //redis client
    app.redis = redis_client;

    //mongo client
    mongo_client.connect(process.env.MONGOLAB_URI ||
                         'mongodb://127.0.0.1:27017/rtchat',
        function(err, db) {
        if (err) throw err;

        app.mongo = {};
        app.mongo.users = db.collection('users');
        app.mongo.users.ensureIndex({email: 1}, {unique: true, sparse: true},
                                  function(err) {});
    });

    //set vars
    app.set('port', process.env.PORT || 8085);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');

    //middleware
    app.use(express.cookieParser());
    app.use(express.session({secret: 'na.xuf8s01jj2g.z9'}));
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    app.all('/', function checkAuth(req, res, next) {
        if (!req.session.user) {
            res.render('login.jade');
        } else {
            next();
        }
    });


    //add db-s to request
    app.all('*', function(req, res, next) {
        req.mongo = app.mongo;
        req.redis = app.redis;
        next();
    });

    //params
    app.param(function(name, fn) {
        if (fn instanceof RegExp) {
            return function(req, res, next, val) {
                var captures;
                if (captures = fn.exec(String(val))) {
                    req.params[name] = captures;
                    next();
                } else {
                    next('route');
                }
            }
        }
    });
    app.param('id', /\d+/);
    app.param('username', /\w+/);
    app.param('roomname', /\w+/);
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

var CLEF_APP_ID = '5f0c97b3ac2fe0f8c7ffedcf058140fe',
    CLEF_APP_SECRET = 'd7c79d9885e3beba070c18669591955a';

var GOOGLE_APP_ID = '679216768366-eqs4cvu2scd9bm4bjahmsn1mesv428g7.apps.googleusercontent.com',
    GOOGLE_APP_SECRET = 'W9dxaEJrBCG3dM1NAimLMRxU';

app.get('/', function(req, res) {
    var user = req.session.user;
    console.log(user);
    res.render('index.jade', {user: user});
});

app.get('/oauth2/clef', function(req, res) {
    var code = req.param('code');
    var url = 'https://clef.io/api/v1/authorize';
    var form = {app_id:CLEF_APP_ID, app_secret:CLEF_APP_SECRET, code:code};

    request.post({url:url, form:form}, function(error, response, body) {
        var token = JSON.parse(body)['access_token'];
        request.get('https://clef.io/api/v1/info?access_token=' + token,
            function(error, response, body) {
                /* {
                  info: {
                    id: '12345',
                    first_name: 'Jesse',
                    last_name: 'Pollak',
                    phone_number: '1234567890',
                    email: 'jesse@getclef.com'
                  },
                  success: true
                }
                */
                var resp = JSON.parse(body)['info'];
                req.session.user = {'email': resp['email']};
                res.redirect('/');
            });
    });
});

app.post('/oauth2/clef/logout', function(req, res) {
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
});

app.get('/oauth2/google', function(req, res) {
    res.redirect("https://accounts.google.com/o/oauth2/auth?scope=email&" +
        "response_type=code&client_id=" + GOOGLE_APP_ID +
        "&redirect_uri=http%3A%2F%2Frtchat.dit.in.ua%3A8085%2Foauth2%2Fgoogle%2Fauth");
});

app.get('/oauth2/google/auth', function(req, res) {
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
                req.session.user = {'email': resp['email']};
                console.log(req.session);
                res.redirect('/');
            });
    });
});

app.get('/getfriends', function(req, res) {
    req.mongo.users.findOne({'email': req.session.user.email}, {'friends': true}, function(err, friends) {
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
});

app.get('/getonlinefriends', function(req, res) {
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
});

