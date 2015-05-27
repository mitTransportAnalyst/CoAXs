var express = require('express');
var app = express();


var morgan       = require('morgan');
var bodyParser   = require('body-parser');


app.use(morgan('dev'));
app.use( bodyParser.json() );   


app.use('/public', express.static(__dirname + '/public')); // set up ejs static file management
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.set('view engine', 'ejs');


/// ROUTING /// 
app.get('/', function (req, res) {
	res.render('index.ejs', {
	  data : 'foo',
	});
});

app.get('/geojson/existing', function (req, res) {
  var options = {
    'root'     : __dirname + '/public/routes/shapefiles/existing/',
    'dotfiles' : 'deny',
    'headers'  : {
        'x-timestamp' : Date.now(),
        'x-sent'      : true
    }
  };
  res.sendFile('lines.geojson', options, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
})

app.get('/geojson/proposed', function (req, res) {
  var options = {
    'root'     : __dirname + '/public/routes/shapefiles/proposed/',
    'dotfiles' : 'deny',
    'headers'  : {
        'x-timestamp' : Date.now(),
        'x-sent'      : true
    }
  };
  res.sendFile('proposed.geojson', options, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
})

app.get('/geojson/proposed_stops', function (req, res) {
  var options = {
    'root'     : __dirname + '/public/routes/shapefiles/proposed/',
    'dotfiles' : 'deny',
    'headers'  : {
        'x-timestamp' : Date.now(),
        'x-sent'      : true
    }
  };
  res.sendFile('stops.geojson', options, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
})

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Coaxs app listening at http://%s:%s', host, port);
});