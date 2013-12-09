
/**
 * Module dependencies.
 */

var express = require('express')
, http = require('http')
, path = require('path')

, routes = require('./routes')
, user = require('./routes/user')
, server = require('./routes/server')

, redis = require('redis')
, redis_client = redis.createClient()
, mongo_client = require('mongodb').MongoClient;

var app = express();

app.configure(function(){
    //on redis error
    redis_client.on('error', function (err) {
        console.log('Redis error ' + err);
    });

    //redis client
    app.redis = redis_client;

    //mongo client
    mongo_client.connect('mongodb://127.0.0.1:27017/rtchat', function(err, db) {
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
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

app.get('/', routes.index);
app.get('/server', server.get);
app.post('/server', server.post);
