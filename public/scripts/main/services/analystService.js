// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService, $interval, $http, $q) {

  var token = null;	//oauth2 token for analyst-server login
  var analystUrlBase = 'http://coaxs.mit.edu/api/single?accessToken='; //base URL for Conveyal Analyst-Server
  var analystUrl = ''; //to take the base and the oauth2 token
  var destinationUrlBase = '/load/destinations/'; //base URL for destination grid data
  var defaultShapefile = 'd54d12d0-b34a-4921-89f7-484973dbc3ac',
     defaultGraph = '9d1291a32bf1a1911381fae998a049ad',
	 workerVersion =  'v2.0.0-SNAPSHOT';
  var indicatorAttributes = {};
  var attributeUrlArray = [];
  var attributeIdArray = [];
  
  this.setDestinationData = function(){
    return new Promise(function(resolve, reject){
	  $http.get('/load/destinations/indicators.json')
      .success(function (data, status) {
	    indicatorAttributes = data;
	      for (indicator in indicatorAttributes){
            for (var i =0 ; i < indicatorAttributes[indicator].length; i ++){
	          if (indicatorAttributes[indicator][i]['grid']) {
			    attributeUrlArray.push(indicatorAttributes[indicator][i]['grid']);
	            attributeIdArray.push(indicatorAttributes[indicator][i]['id']);
			  }
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
  
  var baseId = '';
  
  refreshCred = function (baseUUID) {
  return new Promise(function(resolve, reject){
  $http.get('/credentials').success(function (t, status) { 
      token = t.access_token 
	  analystUrl = '';
	  analystUrl = analystUrlBase + token; 
	  baseId = baseUUID;
	  resolve();
	});
  })
  };
  
  this.refreshCred = refreshCred;
  
  var staticRequest = {
    "jobId": supportService.generateUUID(),
	"transportNetworkId": defaultGraph,
	"request": {
	  "date":"2016-04-11","fromTime":28800,"toTime":30600,"accessModes":"WALK","directModes":"WALK","egressModes":"WALK","transitModes":"TRANSIT","walkSpeed":1.1,"bikeSpeed":4.1,"carSpeed":20,"streetTime":90,"maxWalkTime":20,"maxBikeTime":20,"maxCarTime":45,"minBikeTime":10,"minCarTime":10,"suboptimalMinutes":5,"reachabilityThreshold":0,"bikeSafe":1,"bikeSlope":1,"bikeTime":1,"maxRides":4,"bikeTrafficStress":4,"boardingAssumption":"RANDOM","monteCarloDraws":120,
		"scenario":{"id":baseId}
	}
  };
  
  //to get transit network metadata
  var metadataBody = {
    "type": 'static-metadata',
	"graphId": defaultGraph,
	"workerVersion": workerVersion,
	"request": staticRequest
  };
  
  var stopTreesBody = [];

  stopTreesBody[0] = {
    "type": 'static-stop-trees',
	"graphId": defaultGraph,
	"workerVersion": workerVersion,
	"request": staticRequest
  };
  
  //to get stopTrees (walking distances from grid cells to nearby stops)
  var stopTreesResponses = {}
  
  var postToAnalyst = function(body,cb) {return fetch(analystUrl,{method: 'POST', body: body});
  };
 
  var checkWarmup = function(){
    return new Promise(function(resolve, reject){
      console.log('checking if analyst server is warmed up');
	  refreshCred()
	  .then(function(){
	    postToAnalyst(JSON.stringify(metadataBody)).then(function(res){
		  return res.json()})
	  .then(function(metadata){
		  browsochrones[0].setQuery(metadata);
		  browsochrones[1].setQuery(metadata);
		  console.log('analyst server is warmed up');
	      resolve();
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
  
  this.fetchStopTreesAndGrids = function (baseUUID) {  
    return new Promise(function(resolve, reject){
		checkWarmup().then(function(){
			$q.all([
			postToAnalyst(JSON.stringify(stopTreesBody[0])).then(function(res){
			  console.log('fetching stopTrees');
			  return res.arrayBuffer();
			})]).then(function([stopTrees]){
			  stopTreesResponses[baseId]=stopTrees.slice(0);
			  browsochrones[0].setStopTrees(stopTrees.slice(0));
			  browsochrones[1].setStopTrees(stopTrees.slice(0));
			  resolve();
			});
		});
		
		//get destination grid data for calculating accessibility indicators
		$q.all(attributeUrlArray.map(function(gridName){
			  return fetch(destinationUrlBase+gridName+'.grid').then(function(res){
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
			  for (var i =0 ; i < indicatorAttributes[indicator].length; i ++){
			    var attr = indicatorAttributes[indicator][i].id;
			    plotData[scenNum][indicator][attr]={id: attr, verbose: indicatorAttributes[indicator][i].verbose, data: plotDataTemp[attr]}
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
		//staticDefault[i].request.request.scenario.id = scenarios[i].id //supportService.generateUUID();
		staticBody[i] = JSON.stringify(staticDefault[i]);
    }
	
	//fetch a grid for travel times
	if(!isComparison){
	  (function(){
	    return new Promise(function(resolve, reject){
		if(stopTreesBody[0].request.request.scenario.id != scenarios[0].id){ //if the scenario requested is not the same as the scenario for which we have stopTrees loaded in slot 1...
	      if(!stopTreesResponses[scenarios[0].id]){ //and if we don't have the stopTrees cached from a previous request...
		  stopTreesBody[0].request.request.scenario = scenarios[0];
		  console.log('loading new stop trees');
		  postToAnalyst(stopTreesBody[0]).then(function(res){
 		    var stopTrees = res.arrayBuffer();
		    stopTreesResponses[scenarios[0].id] = stopTrees.slice(0);
		    browsochrones[0].setStopTrees(stopTrees.slice(0));
		    console.log('reloaded stop trees');
		    resolve();
		  })
	     } else { //we do have the stopTrees cached from a previous request, so set them
	       console.log('resetting stop trees');
		   browsochrones[0].setStopTrees(stopTreesResponses[scenarios[0].id]);
		   resolve();
	     }
	   } else {
	     console.log('not resetting stop trees');
	     resolve();
	   }
	  })}).then(
	  fetchMetadataIfNeeded(isPointToPoint, 0, scenarios).then(
	  postToAnalyst(staticBody[0]).then(function(res){
		  return res.arrayBuffer()})
		.then(function(buff){
		  console.log('reset bc');
		  browsochrones[0].setOrigin(buff, xy)
		  .then(function(){
			makeIsochronesAndPlotData(0,type).then(function(){resolve(plotData);})
		  })
		})))
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
	  transitive.journeys = transitive.journeys.slice(0,2);
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
  
  
  
  this.getSeedVariant = function (seedVariantId, cb) {
    $http.get('/load/scenario/'+seedVariantId)
      .success(function (data, status) {
	    cb(data)
	  })
  }
  
  this.reroute = function (corridorId,seed,com,comboId, cb) {
		var scenarioJSON = [];
        seed.modifications.forEach(function(route){
          if (route.type === "reroute"){
            scenarioJSON.push(route);
          }
        });
		if (!scenarioJSON[0]){ //no reroute modifications, so we can just copy the base stopTrees for this scenario
		  stopTreesResponses[comboId]=stopTreesResponses[baseId];
		}
		// if (scenarioJSON[0]){
		  // var tempReq = staticRequest;
		  // tempReq.request.scenario.id = comboId;
		  // tempReq.request.scenario.modifications = scenarioJSON;
		  
		  // stopTreesBody[com] = JSON.stringify({
				// "type": 'static-stop-trees',
				// "graphId": defaultGraph,
				// "workerVersion": workerVersion,
				// "request": tempReq
		  // });
		  // reloadStopTrees[com] = true;
		// } else {
		  // reloadStopTrees[com] = false;
		// }
		cb(scenarioJSON);
  };
  
  this.modifyDwell = function (corridorId,scale,seed,cb) {
        var scenarioJSON = [];
        seed.modifications.forEach(function(route){
          if (route.type === "adjust-dwell-time"){
            route.scale = scale;
            scenarioJSON.push(route);
          }
        });
        cb(scenarioJSON)
  };
  
  this.modifySpeed = function (corridorId,scale,seed,cb) {
        var scenarioJSON = [];
        seed.modifications.forEach(function(route){
            if (route.type === "adjust-speed"){
              route.scale = scale;
              scenarioJSON.push(route);
            }
        });
        cb(scenarioJSON)
   };
  
  this.modifyHeadway = function (corridorId,scale,seed,cb) {
        var scenarioJSON = [];
        seed.modifications.forEach(function(route){
            if (route.type === "adjust-frequency"){
              route.entries.forEach(function (entry) {
                entry.headwaySecs = entry.headwaySecs*scale ;
              });
              scenarioJSON.push(route);
            }
          });
        cb(scenarioJSON)
  };
  
 this.removeTrips = function (corridorId,seed,cb) {
        var scenarioJSON = [];
        seed.modifications.forEach(function(route){
            if (route.type === "remove-trips"){
              scenarioJSON.push(route);
            }
          });
        cb(scenarioJSON)
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