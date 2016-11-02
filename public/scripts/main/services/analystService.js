// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService, $interval, $http, $q) {

  var token = null;	//oauth2 token for analyst-server login
  var analystUrlBase = 'https://analyst-preview.conveyal.com/api/single?accessToken=';
  //http://ansons.mit.edu:9090/api/single?accessToken='; //base URL for Conveyal Analyst-Server
  var analystUrl = ''; //to take the base and the oauth2 token
  var destinationUrlBase = 'https://analyst-static.s3.amazonaws.com/grids/boston/'; //base URL for destination grid data
    var defaultShapefile = '6f0207c4-0759-445b-bb2a-170b81bfeec6',
     defaultGraph = '650b39507bce5c884334aa960deb093d',
	 workerVersion =  'v1.5.0-74-geb0f8d0';
  
  // var defaultShapefile = 'd54d12d0-b34a-4921-89f7-484973dbc3ac',
     // defaultGraph = '16550317ab8beb0b55c5d360f2d7101c',
	 // workerVersion =  'v2.0.0-SNAPSHOT';
  var indicatorAttributes = {};
  var attributeUrlArray = [];
  var attributeIdArray = [];
  
  this.setDestinationData = function(){
    return new Promise(function(resolve, reject){
	  $http.get('/load/destinations/indicators')
      .success(function (data, status) {
	    var urls = {};
	    indicatorAttributes = data;
	      for (indicator in indicatorAttributes){
		    urls[indicator] = indicatorAttributes[indicator].basemapUrl;
            for (var i =0 ; i < indicatorAttributes[indicator].categories.length; i ++){
	          attributeUrlArray.push(indicatorAttributes[indicator].categories[i]['grid']);
	          attributeIdArray.push(indicatorAttributes[indicator].categories[i]['id']);
	        }
        };
	    resolve();	  
	  })
	})
  };
  
  var minutes = [];
  for (var i = 1; i <= 120; i++){minutes.push(i)};
  
  var isochrones = [];
  var isochroneLayer = [];
  var plotData = [];
  var transitiveLayer = [];
  var Browsochrones = window.Browsochrones;
  var browsochrones = [];
    
  for (var i=0; i<2; i++){
    isochrones[i] = null;
	isochroneLayer[i] = null;
	browsochrones[i] = new Browsochrones();
  }
  
  refreshCred = function () {
  return new Promise(function(resolve, reject){
  $http.get('/credentials').success(function (t, status) { 
      token = t.access_token 
	  analystUrl = '';
	  analystUrl = analystUrlBase + token; 
	  resolve();
	});
  })
  };
  
  this.refreshCred = refreshCred;
  
  var staticRequest = {
    "jobId": supportService.generateUUID(),
	"transportNetworkId": defaultGraph,
	"request": {
	  "date":"2015-10-19","fromTime":25200,"toTime":32400,"accessModes":"WALK","directModes":"WALK","egressModes":"WALK","transitModes":"WALK,TRANSIT","walkSpeed":1.1,"bikeSpeed":4.1,"carSpeed":20,"streetTime":90,"maxWalkTime":60,"maxBikeTime":20,"maxCarTime":45,"minBikeTime":10,"minCarTime":10,"suboptimalMinutes":5,"reachabilityThreshold":0,"bikeSafe":1,"bikeSlope":1,"bikeTime":1,"maxRides":8,"bikeTrafficStress":4,"boardingAssumption":"RANDOM","monteCarloDraws":120,
		"scenario":{"id":999}
	}
  };
  
  //to get transit network metadata
  var metadataBody = {
    "type": 'static-metadata',
	"graphId": defaultGraph,
	"workerVersion": workerVersion,
	"request": staticRequest
  };

  //to get stopTrees (walking distances from grid cells to nearby stops)
  var stopTreesBody = JSON.stringify({
    "type": 'static-stop-trees',
	"graphId": defaultGraph,
	"workerVersion": workerVersion,
	"request": staticRequest
  });
  
  var postToAnalyst = function(body,cb) {return fetch(analystUrl,{method: 'POST', body: body});
  };
 
  var checkWarmup = function(){
    return new Promise(function(resolve, reject){
      console.log('checking if analyst server is warmed up');
	  refreshCred()
	  .then(function(){
	    postToAnalyst(JSON.stringify(metadataBody))
	  .then(function(res){
	    if(res.status == 200){
		  console.log('analyst server is warmed up');
	      resolve();
		}else{
		  setTimeout(function () {checkWarmup()} , 15000);
		}
	  })
      })
    })
  };
  
  fetchMetadataIfNeeded = function (isPointToPoint, scenNum, scenarios){
    var metadataBodyForScen = metadataBody;
	metadataBodyForScen.request.request.scenario = scenarios[scenNum];
	metadataBodyForScen.request.request.scenario.id = supportService.generateUUID()
	return new Promise(function(resolve, reject){
	  if(!isPointToPoint || browsochrones[scenNum].surfaceLoaded){ //if we're not in point-to-point mode, or if there is already a surface loaded, we don't need to get new metadata.transitiveData, so we can resolve immediately.  resetAll() below is used to set surfaceLoaded to null if the scenario changes.
	    resolve();
	  } else {
	    postToAnalyst(JSON.stringify(metadataBodyForScen)).then(function(res){
		  console.log('fetched metadata');
		  return res.json()
		}).then(function(metadata){
		  browsochrones[scenNum].setTransitiveNetwork(metadata.transitiveData);
		  resolve();
		})
	 }})
  };
  
  this.fetchStopTreesAndGrids = function () {  
    return new Promise(function(resolve, reject){
		checkWarmup().then(function(){
			$q.all([
			postToAnalyst(JSON.stringify(metadataBody)).then(function(res){
			  console.log('fetched metadata');
			  return res.json()}),
			postToAnalyst(stopTreesBody).then(function(res){
			  console.log('fetched stopTrees');
			  return res.arrayBuffer();
			})]).then(function([metadata, stopTrees]){
			  browsochrones[0].setQuery(metadata);
			  browsochrones[0].setStopTrees(stopTrees.slice(0));
			  browsochrones[1].setQuery(metadata);
			  browsochrones[1].setStopTrees(stopTrees.slice(0));
			  resolve();
			});
		});
		
		//get destination grid data for calculating accessibility indicators
		$q.all(attributeUrlArray.map(function(gridName){
			return fetch(destinationUrlBase+gridName).then(function(res){
			return res.arrayBuffer()})
		  })).then( function(res){
			console.log('fetched grids');
			for (i in attributeIdArray) {
			  browsochrones[0].putGrid(attributeIdArray[i],res[i].slice(0));
			  browsochrones[1].putGrid(attributeIdArray[i],res[i].slice(0));
			}
			})
	});
  };

  var makeIsochrones = function(scenNum){
    return new Promise(function(resolve, reject){
    console.log('making isochrones')
    $q.all(minutes.map(function(minute){
	  return browsochrones[scenNum].getIsochrone(minute)})
	  )
	  .then(function(res){
        isochrones[scenNum] = res;
		resolve();
	  })
	})
  };
  
  var makeIsochronesAndPlotData = function(scenNum, type){
	return new Promise(function(resolve, reject){
	  //first, generate a browsochrones surface
	  browsochrones[scenNum].generateSurface(type).then(function(){
	    if(type == 'AVERAGE'){ //we requested average times for point-to-point mode, so we can resolve without making isochrones.
		  resolve(); 
		} else { //we requested median times because we want isochrones
	    makeIsochrones(scenNum).then(function(){
	    //and get an accessibility number for each destination attribute at each minte, to be plotted later
        $q.all(
		  attributeIdArray.map(function(attribute){
		    return $q.all(minutes.map(function(minute){
			  return browsochrones[scenNum].getAccessibilityForGrid(attribute,minute)}))
		})).then(function(res){
			plotDataTemp = {};
			for (var i = 0; i < attributeIdArray.length; i++){
			  plotDataTemp[attributeIdArray[i]] = res[i];
			}
			plotData[scenNum]={}
			for (indicator in indicatorAttributes){
              plotData[scenNum][indicator] = {};
			  for (var i =0 ; i < indicatorAttributes[indicator].categories.length; i ++){
			    var attr = indicatorAttributes[indicator].categories[i].id;
			    plotData[scenNum][indicator][attr]={id: attr, verbose: indicatorAttributes[indicator].categories[i].verbose, data: plotDataTemp[attr]}
			  }
			}
			resolve();
		  })
	    })
        }
	  })
    })
  };
  
  //called when start pin is moved
  this.moveOrigin = function (marker, scenarios, isComparison, isPointToPoint){
	plotData = [];
	var type = '';
	isPointToPoint ? type = 'AVERAGE' : type = 'MEDIAN';
	return new Promise(function(resolve, reject){
	var staticBody = [];
	var staticDefault = [];
	var xy = {};
	var scenNumArray = []
	for (var i=0; i<scenarios.length; i++){
		scenNumArray.push(i);
		isochrones[i] = null;
		//browsochrones uses webmap x,y, which must be obtained from lat/lon of marker
		xy = browsochrones[i].latLonToOriginPoint(marker.getLatLng());
		staticDefault[i] = 
		  {
			"type": 'static',
			"graphId": defaultGraph,
			"workerVersion": workerVersion,
			"request": staticRequest,
			"x": xy.x,
			"y": xy.y
		  };
		
		//set scenario
		staticDefault[i].request.request.scenario = scenarios[i];
		staticDefault[i].request.request.scenario.id = supportService.generateUUID();
		staticBody[i] = JSON.stringify(staticDefault[i]);
    }
	//fetch a grid for travel times
	

	if(!isComparison){
	  fetchMetadataIfNeeded(isPointToPoint, 0, scenarios).then(
	  postToAnalyst(staticBody[0]).then(function(res){
		  return res.arrayBuffer()})
		.then(function(buff){
		  browsochrones[0].setOrigin(buff, xy)
		  .then(function(){
			makeIsochronesAndPlotData(0,type).then(function(){resolve(plotData);})
		  })
		}))
	} else {
//todo fix callback hell
		$q.all(scenNumArray.map(function(i){
		  return new Promise(function(resolve,reject){fetchMetadataIfNeeded(isPointToPoint, i, scenarios).then(
		    postToAnalyst(staticBody[i]).then(function(res){
			  return res.arrayBuffer()})
			.then(function(buff){browsochrones[i].setOrigin(buff, xy)
			.then(function(){
			  makeIsochronesAndPlotData(i,type).then(function(){resolve();})})
		  }))})}))
		  .then(function(){resolve(plotData);})
	 }
	})
  }

  processTransitiveResult = function (res, scenNum) {
    var transitive = res.transitive;
	  transitive.journeys = transitive.journeys.slice(0,3);
	  if (res.travelTime > 254){ //not a feasible journey
	    plotData[scenNum] = {
		  'walkTime' : 0,
		  'waitTime': 999, 
		  'rideTime': 0
		}
	  } else if (res.waitTime > 254 && res.inVehicleTravelTime > 254) { //walk-only journey
	    plotData[scenNum] = {
		  'walkTime' : res.travelTime,
		  'waitTime': 0,
		  'rideTime': 0
		}
	  } else { //regular transit and walk journey
	    plotData[scenNum] = {
 	      'walkTime' : res.travelTime-res.waitTime-res.inVehicleTravelTime,
		  'waitTime' : res.waitTime,
		  'rideTime' : res.inVehicleTravelTime
	    }
	  }
	  var transitiveLines = new Transitive({
	    data:transitive,
		styles: {
		  multipoints_merged: {
		    r: 6
		  },
          stops_merged: {
            r: 4
          },
		  places: {
		    r: 6
		  },
		  labels: {
		    display: 'none'
		  },
		  segments: {
		    'stroke-width': '4px',
			'stroke-opacity': 0.8,
			'stroke-dasharray': function(display, segment){
			  if (segment.type === 'WALK'){return '6,8'}
			}
		  },
		  'segments-halo': {
		    'stroke-opacity': 0.4
		  }
        },
		zoomFactors: [{
          minScale: 0,
          gridCellSize: 25,
          internalVertexFactor: 50,
          angleConstraint: 10,
          mergeVertexThreshold: 50
        }, {
          minScale: 0.5,
          gridCellSize: 0,
          internalVertexFactor: 0,
          angleConstraint: 5,
          mergeVertexThreshold: 0
        }]
	  });
	  transitiveLayer[scenNum] = new L.TransitiveLayer(transitiveLines)
  }
  
  this.moveDestination = function (cb, marker, isComparison, map){
    plotData = [];
	if (browsochrones[0].surfaceLoaded ){ //time surface for origin already loaded
	if(transitiveLayer[0]){map.removeLayer(transitiveLayer[0])};
	if(transitiveLayer[1]){map.removeLayer(transitiveLayer[1])};
	var xy = browsochrones[0].latLonToOriginPoint(marker.getLatLng());
    browsochrones[0].generateDestinationData(xy).
	then(function(res){
	  processTransitiveResult(res,0);
	  if(!isComparison){  
	  cb(plotData);
	  map.addLayer(transitiveLayer[0]);
	  transitiveLayer[0]._refresh();
	  } else { 
		browsochrones[1].generateDestinationData(xy).
		then(function(res){
		  processTransitiveResult(res,1)
		  cb(plotData);
		  map.addLayer(transitiveLayer[1]);
		  transitiveLayer[1] ._refresh();
		});
	  }
	})
	} else { //time surface for origin not yet loaded
	  cb(null); //passing null to the callback function runs refresh origin
	}
  }
  
  // clear out everything that already exists, reset opacities to defaults
  this.resetAll = function (map, c) {
    for (var i = 0; i < 2; i++){
	browsochrones[i].surfaceLoaded = false;
	isochrones[i] = null;
	if(transitiveLayer[i]){map.removeLayer(transitiveLayer[i])};
	if(isochroneLayer[i]){map.removeLayer(isochroneLayer[i])};
	}
  };
  
  // New modification functions  corridorID: "A", "B", "C", "D", "E"  scale: the modification scale
  this.modifyDwells = function (corridorId,scale,cb) {
    $http.get('/load/scenario/'+corridorId)
      .success(function (data, status) {
        var scenarioJSON = [];
        data.modifications.forEach(function(route){
          if (route.type === "adjust-dwell-time"){
            route.scale = scale;
            scenarioJSON.push(route);
          }
          }
        );
        cb(scenarioJSON)
      })
  };
  
  this.modifySpeed = function (corridorId,scale,cb) {
    $http.get('/load/scenario/'+corridorId)
      .success(function (data, status) {
        var scenarioJSON = [];
        data.modifications.forEach(function(route){
            if (route.type === "adjust-speed"){
              route.scale = scale;
              scenarioJSON.push(route);
            }
          }
        );
        cb(scenarioJSON)
      })
  };
  
  this.modifyHeadway = function (corridorId,scale,cb) {
    $http.get('/load/scenario/'+corridorId)
      .success(function (data, status) {
        var scenarioJSON = [];
        data.modifications.forEach(function(route){
            if (route.type === "adjust-frequency"){
              route.entries.forEach(function (entry) {
                entry.headwaySecs = entry.headwaySecs*scale ;
              });
              scenarioJSON.push(route);
            }
          }
        );
        cb(scenarioJSON)
      })
  };
  
  this.modifyModes = function (routeTypes, c) {
    optionC[c].scenario.modifications.push({
      type: 'remove-trip',
      agencyId: agencyId,
      routeId: null,
      tripId: null,
      routeType: routeTypes
    });
  };

  // show vector isochrones for selected cutoff timeVal
  this.showVectorIsos = function(timeVal, map, isComparison) {
		if(isochroneLayer[0]){map.removeLayer(isochroneLayer[0])};
		if(isochroneLayer[1]){map.removeLayer(isochroneLayer[1])};
		isochroneLayer[0] = L.geoJson(isochrones[0][timeVal], {
          style: {
            stroke      : true,
            fillColor   : '#FDB813',
            color       : '#F68B1F',
            weight      : 1,
            fillOpacity : 0.25,
            opacity     : 1,
			clickable   : false
          }
        });
        isochroneLayer[0].addTo(map);
    if (isComparison) {
	  isochroneLayer[1] = L.geoJson(isochrones[1][timeVal], {
          style: {
            stroke      : true,
            fillColor   : '#89cff0',
			color : '#45b3e7',
            weight      : 1,
            fillOpacity : 0.25,
            opacity     : 1
          }
        });
        isochroneLayer[1].addTo(map);
    }
  };
});