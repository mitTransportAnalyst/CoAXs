// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService, $interval, $http, $q) {

  var token = null;	//oauth2 token for analyst-server login
  var analystUrlBase = 'https://analyst-dev.conveyal.com/api/single?accessToken='; //base URL for Conveyal Analyst-Server
  var analystUrl = ''; //to take the base and the oauth2 token
  var destinationUrlBase = 'https://analyst-static.s3.amazonaws.com/grids/boston/'; //base URL for destination grid data
  var defaultShapefile = '6f0207c4-0759-445b-bb2a-170b81bfeec6',
     defaultGraph = '28ea738684a2829a3ca7dd73bb304b99',
	 workerVersion =  'v1.5.0-68-ga7c6904';
  var indicatorAttributes = {}
  
  this.setDestinationData = function(data){
    indicatorAttributes = data;
  };
  
  var attributeUrlArray = [];
  var indicatorNameArray = [];  
  var attributeNameArray = [];
  var accessibilityIndicator = [];
  
  this.indicatorNameArray = indicatorNameArray;
  
  for (indicator in indicatorAttributes){
    for (var i =0 ; i < indicatorAttributes[indicator].length; i ++){
	  attributeUrlArray.push(indicatorAttributes[indicator][i]['grid']);
	  indicatorNameArray.push(indicator);
	  attributeNameArray.push(indicatorAttributes[indicator][i]['id']);
	}
  };
  var isochrones = [];
    isochrones[0] = null;
    isochrones[1] = null;
  var isochroneLayer = [];
    isochroneLayer[0] = null;
    isochroneLayer[1] = null;
  var plotData = {};

  // for (var j = 0; j<=1 ; j++){
  // for (var i = 1; i<=120; i++){plotData[j][i] = [];plotData[0][i] = [];}}
  var transitiveLayer = null;
  var Browsochrones = window.Browsochrones;
  var browsochrones = [];
    browsochrones[0] = new Browsochrones();
    browsochrones[1] = new Browsochrones();
  
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
  
  var analystState = {
  "staticRequest":
	{"jobId": supportService.generateUUID(),
	 "transportNetworkId": defaultGraph,
	 "request": {
		"date":"2015-10-20","fromTime":25200,"toTime":28800,"accessModes":"WALK","directModes":"WALK","egressModes":"WALK","transitModes":"WALK,TRANSIT","walkSpeed":1.4,"bikeSpeed":4.1,"carSpeed":20,"streetTime":90,"maxWalkTime":60,"maxBikeTime":20,"maxCarTime":45,"minBikeTime":10,"minCarTime":10,"suboptimalMinutes":5,"reachabilityThreshold":0,"bikeSafe":1,"bikeSlope":1,"bikeTime":1,"maxRides":8,"bikeTrafficStress":4,"boardingAssumption":"RANDOM","monteCarloDraws":180,
		"scenario":{}
	  }
	}
  };
  
  	//to get transit network metadata
    var metadataBody = JSON.stringify(
	  {
	    "type": 'static-metadata',
	    "graphId": defaultGraph,
		"workerVersion": workerVersion,
	    "request": analystState.staticRequest
	  }
	);
	
	//to get stopTrees (walking distances from grid cells to nearby stops)
	var stopTreesBody = JSON.stringify(
	  {
	    "type": 'static-stop-trees',
	    "graphId": defaultGraph,
		"workerVersion": workerVersion,
	    "request": analystState.staticRequest
	  }
	);
	
 
  var checkWarmup = function(){
    return new Promise(function(resolve, reject){
      console.log('checking if analyst server is warmed up');
	  refreshCred().then(function(){
	  fetch(analystUrl,{
		  method: 'POST',
		  body: metadataBody
	  }).then(function(res){
		if(res.status == 200){
		  console.log('analyst server is warmed up');
	      resolve();
		} else {
		  setTimeout(function () {checkWarmup()} , 15000);
		}
	  })
      })
    })
  };
  
  this.fetchMetadata = function () {  
    return new Promise(function(resolve, reject){
	checkWarmup().then(function(){
	$q.all([ 
		fetch(analystUrl,{
		  method: 'POST',
		  body: metadataBody
		}).then(function(res){
		  console.log('fetched metadata');
		  return res.json()
		}),
		fetch(analystUrl,{
		  method: 'POST',
		  body: stopTreesBody
		}).then(function(res){
		  console.log('fetched stopTrees');
		  return res.arrayBuffer()
		})
	  ])
	  .then(function([metadata, stopTrees]){
		browsochrones[0].setQuery(metadata);
		browsochrones[0].setStopTrees(stopTrees);
		browsochrones[0].setTransitiveNetwork(metadata.transitiveData);
		browsochrones[1].setQuery(metadata);
		browsochrones[1].setStopTrees(stopTrees);
		browsochrones[1].setTransitiveNetwork(metadata.transitiveData);
		resolve();
		});
	})
	
	//get destination grid data for calculating accessibility indicators
	console.log('fetching grids');
	
	$q.all(attributeUrlArray.map(function(gridName){
		return fetch(destinationUrlBase+gridName).then(function(res){
		return res.arrayBuffer()})
	  })).then( function(res){
		for (i in attributeNameArray) {
		  browsochrones[0].putGrid(attributeNameArray[i],res[i].slice(0));
		  browsochrones[1].putGrid(attributeNameArray[i],res[i].slice(0));
		}
		})
	});
  };
  
  var minutes = [];
  
  for (i = 1; i <= 120; i++){minutes.push(i)};

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
  
  var makeIsochronesAndPlotData = function(scenNum){
    return new Promise(function(resolve, reject){
	  //first, generate a browsochrones surface
	  browsochrones[scenNum].generateSurface().then(function(){
	    //then make isochrones
		if (!isochrones[scenNum]){makeIsochrones(scenNum).then(function(res){resolve()})};
	  
		//and get an accessibility number for each destination attribute, to be plotted later
		for (i = 0; i < attributeNameArray.length; i++){
		  $q.all(minutes.map(function(minute){
			  return browsochrones[scenNum].getAccessibilityForGrid(attributeNameArray[i],minute)})
		  ).then(function(res){
			plotData[scenNum] = res;
			resolve();
		  })
		}
      })
  })
  };
  
  //called when start pin is moved
  this.moveOrigin = function (marker, isComparison, scenarios){
	return new Promise(function(resolve, reject){
    //browsochrones uses webmap x,y, which must be obtained from lat/lon of marker
	var staticBody = [];
	var xy = [];
	for (var i=0; i<2; i++){
		isochrones[i] = null;
		xy[i] = browsochrones[i].latLonToOriginPoint(marker.getLatLng());
		var staticDefault = [];
		staticDefault[i] = 
		  {
			"type": 'static',
			"graphId": defaultGraph,
			"workerVersion": workerVersion,
			"request": analystState.staticRequest,
			"x": xy[i].x,
			"y": xy[i].y
		  };
		
		//set scenario
		staticDefault[i].request.scenario = scenarios[i];
		staticBody[i] = JSON.stringify(staticDefault[i]);
    }
	
	//fetch a grid for travel times
	if(!isComparison){
	  fetch(analystUrl,{
		  method: 'POST',
		  body: staticBody[0]
		}).then(function(res){
		  return res.arrayBuffer()
		}).then(function(buff){
		  browsochrones[0].setOrigin(buff, xy[0])
		  .then(function(){
            console.log('making plot data');
			makeIsochronesAndPlotData(0).then(function(){resolve();})
		  })
		})
	} else {
//todo fix callback hell
		fetch(analystUrl,{
			  method: 'POST',
			  body: staticBody[0]
			}).then(function(res){
			  return res.arrayBuffer()
			}).then(function(buff){
			  browsochrones[0].setOrigin(buff, xy[0])
			  .then(function(){
				makeIsochronesAndPlotData(0).then(function(){
				fetch(analystUrl,{
					  method: 'POST',
					  body: staticBody[1]
					}).then(function(res){
					  return res.arrayBuffer()
					}).then(function(buff){
					  browsochrones[1].setOrigin(buff, xy[1])
					  .then(function(){
						console.log('making plot data');
						makeIsochronesAndPlotData(1).then(function(){resolve();})
					  })
					})
				})
			  })
			})
	}
  })}

  processTransitiveResult = function (res, scenNum) {
    var transitive = res.transitive;
	  transitive.journeys = transitive.journeys.slice(0,1);
	  if (res.travelTime > 254){
	    plotData[scenNum] = {'average_rideTime' : 999}
	  } else {
	  plotData[scenNum] = {'average_walkTime' : res.travelTime-res.waitTime-res.inVehicleTravelTime,
			'average_waitTime' : res.waitTime,
			'average_rideTime' : res.inVehicleTravelTime};
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
		  }
        }
	  });
	  transitiveLayer[scenNum] = new L.TransitiveLayer(transitiveLines)
  }
  
  this.moveDestination = function (cb, marker, isComparison, map, scenario0, scenario1){
	if(transitiveLayer){map.removeLayer(transitiveLayer)};
	var xy0 = browsochrones[0].latLonToOriginPoint(marker.getLatLng())
	var xy1 = browsochrones[0].latLonToOriginPoint(marker.getLatLng())
    browsochrones[0].generateDestinationData(xy0).
	then(function(res){
	  processTransitiveResult(res,0);
	  if(!isComparison){  
	  cb(plotData);
	  map.addLayer(transitiveLayer);
	  transitiveLayer._refresh();
	  } else { 
		browsochrones[1].generateDestinationData(xy1).
		then(function(res){
		  processTransitiveResult(res,1)
		  cb(plotData);
		  map.addLayer(transitiveLayer);
		  transitiveLayer._refresh();
		});
	  }
	})
  }
  
  // clear out everything that already exists, reset opacities to defaults
  this.resetAll = function (map, c) {
    if(transitiveLayer){map.removeLayer(transitiveLayer)};
	if(isochroneLayer[1]){map.removeLayer(isochroneLayer[1])};
	if(isochroneLayer[0]){map.removeLayer(isochroneLayer[0])};
  };

  this.setScenarioNames = function (scenarioName, c){
	optionC[c].scenario.name = scenarioName;
  };
  
  // filter through and remove routes that we don't want banned on each scenario SPA call
  this.modifyRoutes = function (keepRoutes, c) { 
    keepRoutes = keepRoutes.map(function (route) { return route.routeId;  }); // we just want an array of routeIds, remove all else
    var rmRoutes = allRoutes.filter(function (route) { return keepRoutes.indexOf(route) < 0; });
    var routesMod = {
      type      : 'remove-trip',
      agencyId  : rmRoutes.length > 0 ? agencyId : null,
      routeId   : rmRoutes,
      tripId    : null,
    };
    optionC[c].scenario.modifications.push(routesMod);
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

  this.modifyFrequency = function (corridorId,scale,cb) {
    $http.get('/load/scenario/'+corridorId)
      .success(function (data, status) {
        var scenarioJSON = [];
        data.modifications.forEach(function(route){
            if (route.type === "adjust-frequency"){
              route.entries.forEach(function (entry) {
                entry.headwaySecs = entry.headwaySecs/scale ;
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
  }

  // swap between tile layer and vector isos layer
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
            opacity     : 1
          }
        });
        isochroneLayer[0].addTo(map);

    if (isComparison) {
      if(isochroneLayer[1]){map.removeLayer(isochroneLayer[1])};
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