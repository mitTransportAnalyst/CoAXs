var express = require('express');
var app = express();


var morgan       = require('morgan');
var bodyParser   = require('body-parser');


app.use(morgan('dev'));
app.use( bodyParser.json() );   


app.use('/static', express.static(__dirname + '/public')); // set up ejs static file management
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.set('view engine', 'ejs');


app.get('/', function (req, res) {
	res.render('index.ejs', {
	  data : 'foo',
	});
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});