
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
        app.mongo.test = db.collection('test');
        app.mongo.test.ensureIndex({date: 1}, {unique: true, sparse: true},
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

var APP_ID = '5f0c97b3ac2fe0f8c7ffedcf058140fe',
    APP_SECRET = 'd7c79d9885e3beba070c18669591955a';

app.get('/', function(req, res) {
    var user = (req.session.user || false)
    res.render('index.jade', {user: user, email: user['email']});
});

app.get('/login', function(req, res) {
    var code = req.param('code');
    var url = 'https://clef.io/api/v1/authorize';
    var form = {app_id:APP_ID, app_secret:APP_SECRET, code:code};

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
                req.session.user = JSON.parse(body)['info'];
                console.log(req.session.user);
                res.redirect('/');
            });
    });
});

app.post('/logout', function(req, res) {
    var url = "https://clef.io/api/v1/logout";
    var logout_token = req.body['logout_token'];
    if (logout_token) {
        console.log(logout_token);
        form = {logout_token:logout_token,app_id:APP_ID,app_secret:APP_SECRET};
        request.post({url:url, form:form}, function(err, response, body) {
            console.log(JSON.parse(body)['clef_id']);
            res.send('ok');
        });
    }
});

