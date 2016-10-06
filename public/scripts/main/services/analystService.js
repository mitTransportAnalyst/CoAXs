// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService, $interval, $http, $q) {

  var token = null;	//oauth2 token for analyst-server login
  var analystUrlBase = 'https://analyst-dev.conveyal.com/api/single?accessToken='; //base URL for Conveyal Analyst-Server
  var analystUrl = ''; //to take the base and the oauth2 token
  var destinationUrlBase = 'https://analyst-static.s3.amazonaws.com/grids/boston/'; //base URL for destination grid data
  var defaultShapefile = '6f0207c4-0759-445b-bb2a-170b81bfeec6',
     defaultGraph = '28ea738684a2829a3ca7dd73bb304b99',
	 workerVersion =  'v1.5.0-68-ga7c6904';
  var indicatorAttributes = {
    jobs:[
	 {id: 'jobs1',
	  grid: 'Jobs_with_earnings__1250_per_month_or_less.grid',
	  verbose: 'Jobs | $'},
	 {id: 'jobs2',
	  grid: 'Jobs_with_earnings__1251_-__3333_per_month.grid',
	  verbose: 'Jobs | $$'},
	 {id: 'jobs3',
	  grid: 'Jobs_with_earnings_greater_than__3333_per_month.grid',
	  verbose: 'Jobs | $$$'}],
	workers:[
	 {id: 'workers1',
	  grid: 'Workers_with_earnings__1250_per_month_or_less.grid',
	  verbose: 'Workers | $'},
	 {id: 'workers2',
	  grid: 'Workers_with_earnings__1251_-__3333_per_month.grid',
	  verbose: 'Workers | $$'},
	 {id: 'workers3',
	  grid: 'Workers_with_earnings_greater_than__3333_per_month.grid',
	  verbose: 'Workers | $$$'}]};
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
  var isochrones = []
    isochrones[0] = null;
    isochrones[1] = null;
  var isochroneLayer0 = null;
  var isochroneLayer1 = null;
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
  "transitive": null,
  "isochrone": null,
  "key": null,
  "origin": [42.35042512243457,71.03485107421875],
  "destination":[42.35042512243457,-71.03485107421875],
  "staticRequest":
	{"jobId": supportService.generateUUID(),
	 "transportNetworkId": defaultGraph,
	 "request": {
		"date":"2015-10-20","fromTime":25200,"toTime":28800,"accessModes":"WALK","directModes":"WALK","egressModes":"WALK","transitModes":"WALK,TRANSIT","walkSpeed":1.3888888888888888,"bikeSpeed":4.166666666666667,"carSpeed":20,"streetTime":90,"maxWalkTime":60,"maxBikeTime":20,"maxCarTime":45,"minBikeTime":10,"minCarTime":10,"suboptimalMinutes":5,"reachabilityThreshold":0,"bikeSafe":1,"bikeSlope":1,"bikeTime":1,"maxRides":8,"bikeTrafficStress":4,"boardingAssumption":"RANDOM","monteCarloDraws":180,
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
  this.moveOrigin = function (marker, isComparison, scenario0, scenario1){
	return new Promise(function(resolve, reject){
    //browsochrones uses webmap x,y, which must be obtained from lat/lon of marker
	isochrones[0] = null;
	isochrones[1] = null;
	var xy = browsochrones[0].latLonToOriginPoint(marker.getLatLng())
    var staticDefault = 
	  {
	    "type": 'static',
	    "graphId": defaultGraph,
		"workerVersion": workerVersion,
	    "request": analystState.staticRequest,
		"x": xy.x,
		"y": xy.y
	  };
	
	//set scenario
	staticDefault.request.scenario = scenario0;
	staticBody0 = JSON.stringify(staticDefault);
	staticDefault.request.scenario = scenario1;
	staticBody1 = JSON.stringify(staticDefault);
	
	//fetch a grid for travel times
	
	if(!isComparison){
	  fetch(analystUrl,{
		  method: 'POST',
		  body: staticBody0
		}).then(function(res){
		  return res.arrayBuffer()
		}).then(function(buff){
		  browsochrones[0].setOrigin(buff, xy)
		  .then(function(){
            console.log('making plot data');
			makeIsochronesAndPlotData(0).then(function(){resolve();})
		  })
		})
	} else {
//		$q.all([
		// function(){return new Promise(function(resolve, reject){
		fetch(analystUrl,{
			  method: 'POST',
			  body: staticBody0
			}).then(function(res){
			  return res.arrayBuffer()
			}).then(function(buff){
			  browsochrones[0].setOrigin(buff, xy)
			  .then(function(){
				console.log('making plot data');
				makeIsochronesAndPlotData(0).then(function(){
				//todo use $q.all
				fetch(analystUrl,{
			  method: 'POST',
			  body: staticBody1
			}).then(function(res){
			  return res.arrayBuffer()
			}).then(function(buff){
			  browsochrones[1].setOrigin(buff, xy)
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

  
  this.moveDestination = function (cb, marker, isComparison, map, scenario0, scenario1){
    
	if(transitiveLayer){map.removeLayer(transitiveLayer)};
	
	var xy = browsochrones[0].latLonToOriginPoint(marker.getLatLng())
    browsochrones[0].generateDestinationData(xy).
	then(function(res){
	  var transitive = res.transitive;
	  transitive.journeys = transitive.journeys.slice(0,2);
	  plotData['1'] = {'average_walkTime' : res.travelTime-res.waitTime-res.inVehicleTravelTime,
			'average_waitTime' : res.waitTime,
			'average_rideTime' : res.inVehicleTravelTime};
	  if(!isComparison){  
	  cb(plotData);
	  var transitiveLines = new Transitive({'data':transitive});
	  transitiveLayer = new L.TransitiveLayer(transitiveLines)
	  map.addLayer(transitiveLayer);
	  transitiveLayer._refresh();
	  } else { 
		browsochrones[1].generateDestinationData(xy).
		then(function(res){
		  var transitive = res.transitive;
		  transitive.journeys = transitive.journeys.slice(0,2);
		  plotData['2'] = {'average_walkTime' : res.travelTime-res.waitTime-res.inVehicleTravelTime,
				'average_waitTime' : res.waitTime,
				'average_rideTime' : res.inVehicleTravelTime};
		  cb(plotData);
		  var transitiveLines = new Transitive({'data':transitive});
		  transitiveLayer = new L.TransitiveLayer(transitiveLines)
		  map.addLayer(transitiveLayer);
		  transitiveLayer._refresh();
	});
	
	}
	})
  }
  
  var optionCurrent = {
    scenario      : {
      id            : 0,
      description   : 'Run on load from CoAXs SPA.',
      modifications : [],
    }
  };
  
  var optionC = []
  
  for (i = 0; i < 2; i++){
  optionC[i] = {
    scenario      : {
      id            : i,
      description   : 'Scenario ' + i + ' from CoAXs',
      modifications : []
    }
  }; 
  }
      
var allRoutes = ['CR-Fairmount', '749', '2b8cb87', '3c84732', '364b0b2', 'a3e69c4', '9d14048', '62e5305', 'a64adac', 'b35db84', '79d4855', '78cc24d'];
var agencyId = 'MBTA+v6';
var banExtraAgencies = [
    {
      type      : 'remove-trip',
      agencyId  : 'KM',
      routeId   : null,
      tripId    : null,
    }];

  // holds current states for different map layers, etc. (allows you to grab and remove, replace)
  var isoLayer   = null;
  var isoLayerOld = null;

  var vectorIsos = null;
  var vecComIsos = null;
  
  var currentIso = null;
  var compareIso = null;


  // clear out everything that already exists, reset opacities to defaults
  this.resetAll = function (map, c) {
    if(transitiveLayer){map.removeLayer(transitiveLayer)};
	if(isochroneLayer1){map.removeLayer(isochroneLayer1)};
	if(isochroneLayer0){map.removeLayer(isochroneLayer0)};
  };

  this.killCompareIso = function (map) {
    if (compareIso) { map.removeLayer(compareIso); };
    vecComIsos = false;
    compareIso = null;
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

  this.loadExisting = function (poi, map, cb) {
    vectorIsos = poi.isochrones;
    analyst.singlePointRequest({
      lat : poi.lat,
      lng : poi.lng,
    }, defaultGraph, defaultShapefile, optionCurrent)
    .then(function (response) {
      if (isoLayer) {
        isoLayer.redraw(); 
      } else {
        isoLayer = response.tileLayer;
        isoLayer.addTo(map);
      }
      cb(true);
    })
    .catch(function (err) {
      console.log(err);
      cb(false);
    });;
  }

  this.deleteTileIsos = function (map) {
    if(isoLayer){map.removeLayer(isoLayer)};
  }
  
  this.prepCustomScenario = function (customAnalystRequest, c) {
	console.log('prepping custom scenario');
	optionC[c] = null;
	console.log(optionC);
	optionC[c] = customAnalystRequest;
	console.log(optionC);
	optionC[c].scenario.modifications.push(banExtraAgencies[0])
	console.log(optionC);
  };
  
  this.singlePointComparison = function (marker, map, cb) {
   	console.log(optionC[0]);
	console.log(optionC[1]);
	
	optionC[0].graphId? graph0 = optionC[0].graphId : graph0 = defaultGraph;
	optionC[1].graphId? graph1 = optionC[1].graphId : graph1 = defaultGraph;

	
	analyst.singlePointComparison({
      lat : marker.lat,
      lng : marker.lng,
    }, graph1, graph0, defaultShapefile, optionC[1], optionC[0])
		.then(function (response) {
			var plotData = {};
			var cPlotData = {};
			
			//compile cumulative plot data for scenario 1
			for (key in subjects.fields) {
				var id = subjects.prefix+'.'+subjects.fields[key].id;
				var tempArray = response[0].data[id].pointEstimate.sums.slice(0,120);
				for (var i = 1; i < tempArray.length; i++) { 	tempArray[i] = tempArray[i] + tempArray[i-1] };
				cPlotData[key] = {
					'data' : tempArray.map(function(count, i) { return { x : i, y : count } }),
					'verbose' : subjects.fields[key].verbose
					}
				};
			
			//compile cumulative plot data for scenario 0
			for (key in subjects.fields) {
				var id = subjects.prefix+'.'+subjects.fields[key].id;
				var tempArray = response[1].data[id].pointEstimate.sums.slice(0,120);
				for (var i = 1; i < tempArray.length; i++) { 	tempArray[i] = tempArray[i] + tempArray[i-1] };
				plotData[key] = {
					'data' : tempArray.map(function(count, i) { return { x : i, y : count } }),
					'verbose' : subjects.fields[key].verbose
					}
				};
			// };
			isoLayer = analyst.updateSinglePointLayer(response[0].key, response[1].key);
			isoLayer.addTo(map);
		cb(response[0], response[1], plotData, cPlotData);
		})
  }
  
  // actually run the SPA and handle results from library
  this.singlePointRequest = function (marker, map, timeLimit, cb) {
	console.log(optionC[0])
	
	optionC[0].graphId? graph = optionC[0].graphId : graph = defaultGraph;
	scenario = [];
	scenario[0] = {'scenario': optionC[0].scenario};
	
	analyst.singlePointRequest({
      lat : marker.lat,
      lng : marker.lng,
    }, graph, defaultShapefile, scenario[0])
    .then(function (response) { 
        isoLayer = analyst.updateSinglePointLayer(response.key, null, 7200);
		isoLayer.addTo(map).on('load', function(e){
			isoLayer.setOpacity(1);
			//isoLayerOld.setOpacity(0);
			//isoLayerOld = analyst.updateSinglePointLayerOld(response.key, null);
		});
		//isoLayerOld = analyst.updateSinglePointLayerOld(response.key, null);
		//isoLayerOld.addTo(map);
	  var plotData = subjects.fields;
      for (key in subjects.fields) {
        var id = subjects.prefix+'.'+subjects.fields[key].id;
        var tempArray = response.data[id].pointEstimate.sums.slice(0,120);
        for (var i = 1; i < tempArray.length; i++) { 	tempArray[i] = tempArray[i] + tempArray[i-1] };
        plotData[key]['data'] = tempArray.map(function(count, i) { return { x : i, y : count } });
      }
      cb(response.key, plotData);
    })
    .catch(function (err) {
      console.log(err);
    });
  };
  
  this.updateTiles = function(map, key, timeLimit, cb) {
	//isoLayerOld ? '' : isoLayerOld = isoLayer;
	//isoLayerOld.setOpacity(1);
	isoLayer.setOpacity(0);
	isoLayer = analyst.updateSinglePointLayer(key, null, timeLimit);
	}
  //

  // swap between tile layer and vector isos layer
  this.showVectorIsos = function(timeVal, map, isComparison) {
		if(isochroneLayer0){map.removeLayer(isochroneLayer0)};
		if(isochroneLayer1){map.removeLayer(isochroneLayer1)};
		isochroneLayer0 = L.geoJson(isochrones[0][timeVal], {
          style: {
            stroke      : true,
            fillColor   : '#FDB813',
            color       : '#F68B1F',
            weight      : 1,
            fillOpacity : 0.25,
            opacity     : 1
          }
        });
        isochroneLayer0.addTo(map);

    if (isComparison) {
      if(isochroneLayer1){map.removeLayer(isochroneLayer1)};
	  isochroneLayer1 = L.geoJson(isochrones[1][timeVal], {
          style: {
            stroke      : true,
            fillColor   : '#89cff0',
			color : '#45b3e7',
            weight      : 1,
            fillOpacity : 0.25,
            opacity     : 1
          }
        });
        isochroneLayer1.addTo(map);
	  
    }
  };

});