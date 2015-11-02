var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var config = require('./config');
var MongoClient = require('mongodb').MongoClient
var assert = require('assert');
// var MONGO_URL = 'mongodb://localhost:27017/';
var MONGO_URL = 'mongodb://mem:mem@ds039504.mongolab.com:39504/documents';
var COLL_NAME = 'documents';
var async = require('async');


var request = require('request');
var client = require('twilio')(config.accountSid, config.authToken);


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
// UNCOMMENT TO LOOP
// setTimeout(MAIN_LOOP, 3000);

var states = {};

findIndex_complicated = function(channels, channel) {
  for (i=0; i<channels.length; i++){
    if (channels[i][0] == channel) {
      return i;
    }
  }
  return -1;
}

checkStream = function(channel, number, callback) {
  var url = "https://api.twitch.tv/kraken/streams/" + channel;
  request(url, function (error, response, body) {
    json = JSON.parse(body);
    if (json.stream) {
      // stream is offline
      callback(true, number, channel);
    }
    else {
      // stream is online
      callback(false, number, channel);
    }
  });
}

checkStream_state = function(channel, number, state, collection, channels) {
  console.log("\t\t\tchecking: " + channel + " for " + number);
  var url = "https://api.twitch.tv/kraken/streams/" + channel;
  request(url, function (error, response, body) {
    json = JSON.parse(body);
    if (json.stream) {
      // stream is online
      if (state == 1) {
        console.log("\t\t\tONLINE AND TRUE");
        // state is true
        // do nothing
      }
      else {
        console.log("\t\t\tONLINE AND FALSE");
        // state is false
        // set state to true
        new_channels = channels;
        index = findIndex_complicated(channels, channel);
        // console.log(channel);
        // console.log(channels[index]);
        new_channels[index][1] = 1;
        // console.log(new_channels);

        client.messages.create({
          body: channel + " is live.",
          to: number,
          from: "+13313056064"
        }, function(err, message){
          process.stdout.write(message.sid);
          console.log("\ndone\n");
          collection.update({number: number},{$set: {channels: new_channels}},
          function(err, result){
            // console.log(result);
          });
        });
      }
    }
    else {
      // stream is offline
      if (state == 1) {
        console.log("\t\t\tOFFLINE AND TRUE");
        // state is true
        // set to false
        new_channels = channels;
        index = findIndex_complicated(channels, channel);
        new_channels[index][1] = 0;
        collection.update({number: number},{$set: {channels: new_channels}},
        function(err, result){
          // console.log(result);
        });

      }
      else {
        console.log("\t\t\tOFFLINE AND FALSE");
        // state is false
        // do nothing
      }
    }
  });
}

checked = function(live, number, channel){
  console.log(live + number + channel);
  str = live ? " is ":" is not ";
  client.messages.create({
    body: channel + str + "live.",
    to: number,
    from: "+13313056064"
  }, function(err, message){
    process.stdout.write(message.sid);
    console.log("\ndone\n");
  });
}

saveToDB = function(number, channel){
  MongoClient.connect(MONGO_URL, function(err, db){
    assert.equal(null, err);
    console.log("\tmongo connected");
    // insert into db
    var collection = db.collection(COLL_NAME);
    is_in_db(collection, number, channel);
  });
}

saveToDB_callback = function(status, collection, number, channel)
{
  console.log("\tSTATUS: " + status);
  if (status == 1){
    checkStream(channel, number, checked);
  }
  else if (status == 0){
    var query = {};
    query[channel] = 0;
    collection.update({number: number},{$push: {channels: [channel, 0]}},
    function(err, result){
      // console.log(result);
    });
  }
  else {
    var query = {};
    query[channel] = 0;
    collection.insert({number: number, channels: [[channel, 0]]},
    function(err, result){
      // console.log(result);
    });
  }
}

is_in_db = function(collection, number, channel) {
  // -1 is not found
  // 0 is found, but no channel yet
  // 1 is found and number -> simply text current status
  collection.findOne({number: number}, function(err, docs){
    if (docs){
      if (is_in_arr(docs.channels, number, channel)){
        console.log("found and number -> text");
        saveToDB_callback(1, collection, number, channel);
      }
      else {
        console.log("found, no channel yet");
        saveToDB_callback(0, collection, number, channel);
      }
    }
    else {
      console.log("no number");
      saveToDB_callback(-1, collection, number, channel);
    }
  });
}

is_in_arr = function(arr, number, channel){
  for (i=0; i<arr.length; i++)
  {
    if (arr[i][0] == channel) {
      return true;
    }
  }
  return false;
}

MAIN_LOOP = function(){
  // checkStream("tsm_bjergsen", "6303037034", checked);
  // checkStream("dreamhackcs", "6307294437", checked);
  /**
  if state is false and channel is online -> text user, set state to true

  if state is true and channel is online -> do nothing

  if state is true and channel is offline -> set to false

  if state is false and channel is offline -> do nothing
  */

  MongoClient.connect(MONGO_URL, function(err, db){
    assert.equal(null, err);
    console.log("\tmongo connected\n\n");
    // loop
    var collection = db.collection(COLL_NAME);
    collection.find({}).toArray(function(err, docs){
      docs.map(function(item){
        number = item.number;
        channels = item.channels;
        console.log("checking " + number);
        // console.log(channels);
        for (i=0; i<channels.length; i++) {
          url = channels[i][0];
          status = channels[i][1];
          checkStream_state(url, number, status, collection, channels);
          console.log("\t" + channels[i]);
        }
      });
    });
  });
}

reloop = function(){
  // setTimeout(MAIN_LOOP(), 2000);
  async.waterfall([
      function(callback) {
        console.log("first part");
        MAIN_LOOP(callback);
      },
      function(callback) {
        console.log("second part");
        // arg1 now equals 'one' and arg2 now equals 'two'
        setTimeout(MAIN_LOOP(callback), 30000);
      }
  ], function (err, result) {
      // result now equals 'done'
      console.log(result);
  });
}

// **********************************
// this is where the magic happens
setInterval(function(){MAIN_LOOP();}, 10000);
// **********************************


app.post('/incoming', function(req, res, next){
  var message = req.body.Body.toLowerCase();
  var from = req.body.From;
  console.log("\t" + message + "\n\tfrom: " + from);
  checkStream(message, from, checked);
  saveToDB(from, message);
  // if (message == "hi")
});

app.post('/signup', function(req, res, next){
  var number = req.body.number;
  console.log(req.body);
  client.messages.create({
    body: "Welcome to twext!\nRespond with a twitch channel to start.",
    to: number,
    from: "+13313056064"
  }, function(err, message){
    process.stdout.write(message.sid);
    console.log("\ndone\n");
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.listen(3000, function() {
  console.log('Express server listening on port %d in %s mode', 3000, app.get('env'));
});

module.exports = app;
