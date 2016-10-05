var express = require('express');
var app = express();

var fs = require('fs');

var morgan = require('morgan');
var bodyParser = require('body-parser');

var http = require('http');
var path = require('path');
//
// var AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
// var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
// var S3_BUCKET = process.env.S3_BUCKET;
//
// var aws = require('aws-sdk');
//     aws.config = new aws.Config();
//     aws.config.accessKeyId = AWS_ACCESS_KEY;
//     aws.config.secretAccessKey = AWS_SECRET_KEY;
// var s3 = new aws.S3();
//
// console.log(AWS_ACCESS_KEY, AWS_SECRET_KEY, S3_BUCKET);

app.use(morgan('dev'));  
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


app.use('/public', express.static(__dirname + '/public')); // set up ejs static file management
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.set('view engine', 'ejs');


/// ROUTING /// 
var http    = require('http');
var request = require('request');
var csv     = require('csv-streamify');

var analystCreds = require('request');

var analystReqOpts = {
  url: 'https://analyst-dev.conveyal.com/oauth/token',
  method: 'POST',
  timeout: 10000,
  auth: {
    'user' : process.env.analyst_key,
    'pass' : process.env.analyst_secret
  },
  headers : {
    'content-type'  : 'application/x-www-form-urlencoded',
    'Access-Control-Allow-Origin': '*'
  },
  body: 'grant_type=client_credentials'
};

 app.get('/credentials', function (req, res) {
  var credExpiration = 0,
  clientCredentials = '';
  
  console.log('date: ');
  console.log(parseFloat(credExpiration));  
  if ( parseFloat(Date.now()) >= parseFloat(credExpiration)) {
    console.log('Requesting new credentials from analyst-server')
	analystCreds(analystReqOpts, function (error, response, body){
		console.log(error);
	  clientCredentials = body;
		credExpiration = 3600*1000+parseFloat(Date.now()-60000);
		console.log('New credentials received: ' + clientCredentials +',' + credExpiration);
		console.log(clientCredentials);
		res.send(clientCredentials);
	});
  };
});

app.get('/', function (req, res) {
  res.render('index.ejs', {
    data : 'foo',
  });
});

var fileNames = {
  existing: 'lines.geojson',
  proposed: 'proposed.geojson',
  proposed_priority: 'priority.geojson',
  t_stops: 'stations.geojson',
  proposed_stops: 'stops.geojson',
  cordons: 'cordon.json',
}

app.get('/geojson/:fileId', function (req, res) {
  var options = {
    'root'     : __dirname + '/public/routes/shapefiles/mapApp/',
    'dotfiles' : 'deny',
    'headers'  : {
        'x-timestamp' : Date.now(),
        'x-sent'      : true
    }
  };
  var file = fileNames[req.params.fileId];
  res.sendFile(file, options, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
});


//get for scenario files
app.get('/load/scenario/:fileName', function (req, res) {
  var options = {
    'root'     : __dirname + '/public/routes/scenario',
    'dotfiles' : 'deny',
    'headers'  : {
      'x-timestamp' : Date.now(),
      'x-sent'      : true
    }
  };
  var file = req.params.fileName+".json";
  res.sendFile(file, options, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
});





app.get('/load/routes', function (req, res) {
  var path = __dirname + '/public/routes/shapefiles/mapApp/routes.geojson';
  res.sendFile(path, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
});


app.get('/load/trunks', function (req, res) {
  var path = __dirname + '/public/routes/shapefiles/mapApp/trunks.geojson';
  res.sendFile(path, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
});

app.get('/load/trunks', function (req, res) {
  var path = __dirname + '/public/routes/shapefiles/mapApp/trunks.geojson'
  res.sendFile(path, function (err) {
    if (err) {
      console.log('sendFile error:', err);
      res.status(err.status).end();
    }
  });
});


var globalGetDone = false;
app.get('/startSnapCache/:fileId', function (req, res) {
  globalGetDone = false;
  var params = {
    Bucket: S3_BUCKET,
    Key: req.params.fileId
  };
  var file = require('fs').createWriteStream('temporary.json');

  s3.getObject(params).on('httpData', function(chunk) { 
    file.write(chunk); 
  }).on('httpDone', function() { 
    file.end();
    globalGetDone = true;
    res.status(200).send({started: true});
  }).send();
});

app.get('/loadSnapCache', function (req, res) {
  if (globalGetDone) {
    var options = {
      root: __dirname,
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    };
    var file = 'temporary.json';
    res.sendFile(file, options, function (err) {
      if (err) {
        console.log('sendFile error:', err);
        res.status(err.status).end();
      }
    });
  } else {
    res.status(200).send({notReady: true});
  }
});

app.get('/cachedLocs', bodyParser.json({limit: '50mb'}), function (req, res) {
  var allKeys = [];
  var params = {Bucket: S3_BUCKET};
  
  s3.listObjects(params, function (err, data) {
    if (data) {
      allKeys.push(data.Contents);
      if (data.IsTruncated && data.hasOwnProperty('Contents')) {
        listAllKeys(data.Contents.slice(-1)[0].Key);
      }
      else {
        if (data.hasOwnProperty('Contents')) {
          data = data.Contents.map(function (each) { return each.Key; });
          res.status(200).send(data)
        } else {
          res.status(500).send('Error missing Contents key value.');
        }
      }
    } else {
      console.log('Error occured', err);
      var status = err.status ? err.status : 500;
      res.status(status).send('Error accessing S3 bucket.');
    }
  });
});

app.post('/cachedLocs/:fileId', bodyParser.json({limit: '50mb'}), function (req, res) {
  var fileName = req.params.fileId;
  var params = {
    ACL: 'public-read-write',
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: req.body.newPOIs,
    ContentType: 'application/json'
  }
  
  s3.putObject(params, function(err, response) {
    if (err) {
      console.log('Write file error:', err);
      res.status(err.status).end();
    } else {
      res.status(200).end();
    }
  });
});


// gather google responses from phil's survey, uses csv-streamify to convert csv (not the best library to use)
app.get('/pois', function (req, res) {
  var url = 'http://docs.google.com/spreadsheets/d/19tQgf9MQ_0aD6cDsnT66pKt35GwJxzY3BCm0Uznrdac/export?format=csv&id';
  request(url)
  .pipe(csv({
    objectMode : true, 
    columns    : true
  }, function (err, doc) {
    if (err) { res.status(500).send() }
    else { res.status(200).send(doc) }
  }));;
})

// this is how the app is actually started up, the port can be specified either in command line or will default to 3000
var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Coaxs app listening at http://%s:%s', host, port);
});

