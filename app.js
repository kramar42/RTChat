var express = require('express')
, http = require('http')
, path = require('path')
, url = require('url')
, request = require('request')
, crypto = require('crypto')

, users = require('./routes/users')

, google = require('./routes/google')
, clef = require('./routes/clef')

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

    //add db-s to request
    app.all('*', function(req, res, next) {
        req.mongo = app.mongo;
        req.redis = app.redis;
        next();
    });

    app.all('/', function checkAuth(req, res, next) {
        if (!req.session.user) {
            res.render('login.jade');
        } else {
            req.redis.exists(req.session.user.email, function(err, exists) {
                if (err) throw err;
                if (!exists) {
                    res.render('login.jade');
                } else {
                    next();
                }
            });
        }
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
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

app.get('/', function(req, res) {
    var user = req.session.user;
    res.render('index.jade', {user: user});
});

app.get('/oauth2/google', google.google);
app.get('/oauth2/google/auth', google.google_auth);

app.get('/oauth2/clef', clef.clef);
app.post('/oauth2/clef/logout', clef.clef_logout);

app.get('/getfriends', users.getfriends);
app.get('/getonlinefriends', users.getonlinefriends);

