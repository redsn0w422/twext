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
var MONGO_URL = 'mongodb://localhost:27017/';
var COLL_NAME = 'documents';


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

// Connection URL
// Use connect method to connect to the Server
// MongoClient.connect(url, function(err, db) {
  // assert.equal(null, err);
  // console.log("Connected correctly to server");

    // var collection = db.collection('documents');
    // Insert some documents
    // collection.insertMany([
    //   {a : 1}, {a : 2}, {a : 3}
    // ], function(err, result) {
    //   assert.equal(err, null);
    //   assert.equal(3, result.result.n);
    //   assert.equal(3, result.ops.length);
    //   console.log("Inserted 3 documents into the document collection");
    //   db.close();
    // });
    // collection.find({}).toArray(function(err, docs) {
    //   assert.equal(err, null);
    //   console.log("Found the following records");
    //   console.dir(docs);
    //   db.close();
    // });

//     collection.find({}).toArray(function(err, docs) {
//   assert.equal(err, null);
//   assert.equal(2, docs.length);
//   console.log("Found the following records");
//   console.dir(docs);
//   callback(docs);
// });
// db.students.update(
//    { _id: 1 },
//    { $push: { scores: 89 } }
// )


// });

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
    collection.update({number: number},{$push: {channels: {url: channel, state: 0}}},
    function(err, result){
      // console.log(result);
    });
  }
  else {
    collection.insert({number: number, channels: [{url: channel, state: 0}]},
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
    console.log(docs);
    if (docs){
      if (is_in_arr(docs.channels, channel)){
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

is_in_arr = function(arr, item){
  return (arr.indexOf(item) > -1);
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

  // client.messages.create({
  //   body: "you're my rarest pepe :)",
  //   to: "7086463598",
  //   from: "+13313056064"
  // });
  // saveToDB("+16303037034", "riotgames");
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
        for (i=0; i<channels.length; i++) {
          url = channels[i].url;
          status = channels[i].status;
          console.log("\t" + channels[i].url);
        }
        console.log();
      });
      // setTimeout(MAIN_LOOP(), 30000);
      // var time = 100;
      // var stop = new Date().getTime();
      // while(new Date().getTime() < stop + time) {
      //   // console.log("waiting");
      //     ;
      // }

      // setTimeout(MAIN_LOOP(), 30000);
    });
  });
}

reloop = function(){
  setTimeout(MAIN_LOOP(), 30000);
}

// **********************************
// this is where the magic happens
MAIN_LOOP();
// **********************************


app.post('/incoming', function(req, res, next){
  var message = req.body.Body;
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
