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
  , assert = require('assert');

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

MAIN_LOOP = function(){
  // checkStream("tsm_bjergsen", "6303037034", checked);
  // checkStream("dreamhackcs", "6307294437", checked);


  // client.messages.create({
  //   body: "if you had two penises, would one of them be mine?",
  //   to: "6308158668",
  //   from: "+13313056064"
  // });
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

checked = function(live, number, channel){
  console.log(live + number + channel);
  str = live ? " is ":" is not ";
  client.messages.create({
    body: channel + str + "live.",
    to: number,
    from: "+13313056064"
  });
}

MAIN_LOOP();

app.post('/incoming', function(req, res, next){
  var message = req.body.Body;
  var from = req.body.From;
  console.log("\t" + message + "\n\tfrom: " + from);
  checkStream(message, from, checked);
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
