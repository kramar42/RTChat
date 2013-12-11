
/**
 * Module dependencies.
 */

var express = require('express')
, http = require('http')
, path = require('path')
, url = require('url')
, newrelic = require('newrelic')

, routes = require('./routes')
, api = require('./routes/api')
, servers = require('./routes/servers')

, redis = require('redis')
, mongo_client = require('mongodb').MongoClient;

var app = express();

app.configure(function(){
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
    mongo_client.connect(process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/rtchat',
        function(err, db) {
        if (err) throw err;

        app.mongo = {};
        app.mongo.servers = db.collection('servers');
        app.mongo.servers.ensureIndex({name: 1}, {unique: true, sparse: true}, console.log);
    });

    //set vars
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');

    //middleware
    app.use(app.router);
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
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
    app.param('server_name', /\w+/);
    app.param('username', /\w+/);
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});


app.get('/index', routes.index);
app.post('/login', routes.login);
app.get('/servers', servers.get);
app.get('/servers/:server_name', servers.view);
app.get('/api/me/:username', api.me);
app.get('/api/ping', api.ping);
app.get('/api/login/:username', api.login);
app.get('/api/servers', api.servers);
