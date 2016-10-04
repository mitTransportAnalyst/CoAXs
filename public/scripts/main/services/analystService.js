// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService, $interval, $http, $q) {

  var token = null;	//oauth2 token for analyst-server login
  var analystUrl = '';
  var analystUrlBase = 'https://analyst-dev.conveyal.com/api/single?accessToken=';
  var destinationUrlBase = 'https://analyst-static.s3.amazonaws.com/grids/boston/';
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
	
  for (indicator in indicatorAttributes){
    for (var i =0 ; i < indicatorAttributes[indicator].length; i ++){
	  attributeUrlArray.push(indicatorAttributes[indicator][i]['grid']);
	  indicatorNameArray.push(indicator);
	  attributeNameArray.push(indicatorAttributes[indicator][i]['id']);
	}
  };

  var isochrones[0] = [];
  var isochrones[1] = [];
  var plotData = [];
  
  var Browsochrones = window.Browsochrones;
  var browsochrones = new Browsochrones();

  refreshCred = function () {
  return new Promise(function(resolve, reject){
    console.log('getting token');
	$http.get('/credentials-preview').success(function (t, status) { 
      console.log ('token: ' + t.access_token);
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
		"date":"2015-12-22","fromTime":25200,"toTime":28800,"accessModes":"WALK","directModes":"WALK","egressModes":"WALK","transitModes":"WALK,TRANSIT","walkSpeed":1.3888888888888888,"bikeSpeed":4.166666666666667,"carSpeed":20,"streetTime":90,"maxWalkTime":20,"maxBikeTime":20,"maxCarTime":45,"minBikeTime":10,"minCarTime":10,"suboptimalMinutes":5,"reachabilityThreshold":0,"bikeSafe":1,"bikeSlope":1,"bikeTime":1,"maxRides":8,"bikeTrafficStress":4,"boardingAssumption":"RANDOM","monteCarloDraws":180,
		"scenario":{id: 0}
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
		  setTimeout(function () {checkWarmup()} , 30000);
		}
	  })
      })
    })
  };
  
  this.fetchMetadata = function () {  
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
		browsochrones.setQuery(metadata);
		browsochrones.setStopTrees(stopTrees);
		browsochrones.setTransitiveNetwork(metadata.transitiveData);
	  });
	});
	
	//get destination grid data for calculating accessibility indicators
	console.log('fetching grids');
	
	$q.all(attributeUrlArray.map(function(gridName){
		return fetch(destinationUrlBase+gridName).then(function(res){
		return res.arrayBuffer()})
	  })).then( function(res){
		for (i in attributeNameArray) {
		  browsochrones.putGrid(attributeNameArray[i],res[i].slice(0));
		}
		})
  };
  
  var minutes = [];
  
  for (i = 1; i <= 24; i++){minutes.push(i*5)};

  var makeIsochrones = function(scenNum){
    console.log('making isochrones')
    $q.all(minutes.map(function(minute){
      console.log(minute);
	  return browsochrones.getIsochrone(minute)})
	  )
	  .then(function(res){
        isochrones[scenNum] = res;
	  })
  };
  
  var makePlotData = function(minute, cb){
      browsochrones.generateSurface(minute).then(function(){
	    makeIsochrones();
		for (i = 0; i < attributeNameArray; i++){
		  browsochrones.getAccessibilityForGrid(attributeNameArray[i],minute).then(
		    function(res){
		    plotData.push(res)
		  })
		}})
		if (minute < 60){
		  minute = minute + 15;
		  makePlotData(minute);
		}
		else{
		  console.log(accessibilityIndicator);
		}
  };
  
  //called when start pin is moved
  this.moveOrigin = function (marker, isComparison){
    //browsochrones uses webmap x,y, which must be obtained from lat/lon of marker
	var xy = browsochrones.latLonToOriginPoint(marker.getLatLng())
    var staticBody = JSON.stringify(
	  {
	    "type": 'static',
	    "graphId": defaultGraph,
		"workerVersion": workerVersion,
	    "request": analystState.staticRequest,
		"x": xy.x,
		"y": xy.y
	  });
	
	//fetch a grid for travel times
	
	fetch(analystUrl,{
		  method: 'POST',
		  body: staticBody
		}).then(function(res){
		  return res.arrayBuffer()
		}).then(function(buff){
		  browsochrones.setOrigin(buff, xy)
		  .then(function(){
            console.log('making plot data');
			makePlotData(60)
		  })
		})
  }

  
  this.moveDestination = function (marker, isComparison, map){
    var xy = browsochrones.latLonToOriginPoint(marker.getLatLng())
    browsochrones.generateDestinationData(xy).
	then(function(result){
	  var transitive = result.transitive;
	  transitive.journeys = transitive.journeys.slice(0,2);
	  var transitiveLines = new Transitive({'data':transitive});
	  var transitiveLayer = new L.TransitiveLayer(transitiveLines)
	  map.addLayer(transitiveLayer);
	  transitiveLayer._refresh();
	});
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
    if (isoLayer)   { isoLayer.setOpacity(1); };
    if (currentIso) { map.removeLayer(currentIso); };
    if (compareIso) { map.removeLayer(compareIso); };
    optionC[c].scenario.modifications = []
	optionC[c].scenario.modifications.push(banExtraAgencies[0]); // empty contents of the modifications list entirely
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

  this.modifyDwells = function (keepRoutes, c) {
    var dwell10 = keepRoutes.filter(function (route) { return route.station == 2; }).map(function (route) { return route.routeId; });
    var dwell20 = keepRoutes.filter(function (route) { return route.station == 1; }).map(function (route) { return route.routeId; });
    var dwell30 = keepRoutes.filter(function (route) { return route.station == 0; }).map(function (route) { return route.routeId; });

    var dwellMod = {
      type: 'adjust-dwell-time',
      agencyId: agencyId,
      routeId: [],
      tripId: null,
      stopId: null,
      dwellTime: 30,
    };
    if (dwell10.length > 0) {
      dwellMod.routeId = dwell10; dwellMod.dwellTime = 10;
      optionC[c].scenario.modifications.push(angular.copy(dwellMod));
    };
    if (dwell20.length > 0) {
      dwellMod.routeId = dwell20; dwellMod.dwellTime = 20;
      optionC[c].scenario.modifications.push(angular.copy(dwellMod));
    };
    if (dwell30.length > 0) {
      dwellMod.routeId = dwell30; dwellMod.dwellTime = 30;
      optionC[c].scenario.modifications.push(angular.copy(dwellMod));
    };
  };

  this.modifyFrequencies = function (keepRoutes, c) {
    keepRoutes = keepRoutes.map(function (route) { 
      return {
        routeId: route.routeId,
        frequency: route.peak.min * 60 + route.peak.sec
      };
    });

    keepRoutes.forEach(function (route) {
      optionC[c].scenario.modifications.push({
        type: 'adjust-headway',
        agencyId: agencyId,
        routeId: [route.routeId],
        tripId: null,
        headway: route.frequency,
      });
    });
  }

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
  
  //point-to-point result
  this.ptpRequest = function (startMarker, endMarker, map, cb) {
    fromLat = startMarker.lat;
	fromLng = startMarker.lng;
	toLat = endMarker.lat;
	toLng = endMarker.lng;
  
  $http.get('http://ansons.mit.edu:8080/plan?fromLat='+fromLat+'&fromLon='+fromLng+'&toLat='+toLat+'&toLon='+toLng+'&mode=WALK&full=true').then(function successCallback(res){
	  console.log(res);
  })
  
  $http.get(ptpURL+'?from='+fromLat+','+fromLng+'&to='+toLat+','+toLng+'&startTime=7:30&endTime=08:30&date=2015-10-19&accessModes=WALK&transitModes=TRANSIT&egressModes=WALK&maxWalkTime=10&limit=1').then(function successCallback(res){

	  console.log(res.data);
	  
	  tRoute = null;
	  wRoute = null;
	  
	  res.data.options.forEach(function(route) {
	    route.transit ? tRoute = route : wRoute = route;
	  })

		  walkTime = tRoute.access[0].time + tRoute.egress[0].time
		  waitTime = 0;
		  rideTime = 0;
		  
		  tRoute.transit.forEach(function(t){
		    average_rideTime = rideTime + t.rideStats.avg;
			average_waitTime = waitTime + t.waitStats.avg;
			worstca_rideTime = rideTime + t.rideStats.max;
			worstca_waitTime = waitTime + t.waitStats.max;
			walkTime = walkTime + t.walkTime;
		  });
		  
		  plotData = {'Average':{'average_walkTime' : walkTime,
			'average_waitTime' : average_waitTime,
			'average_rideTime' : average_rideTime,},
			'Worst Case':{'worstca_walkTime' : walkTime,
			'worstca_waitTime' : worstca_waitTime,
			'worstca_rideTime' : worstca_rideTime,}}
		  
		  cb(tRoute.summary, plotData);
	}, function errorCallback(){
		console.log('error in ptp')
    })
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

  // explicitly run request for vector isochrones
  this.vectorRequest = function (marker, compareTrue, cb) {
	//single-point request for baseline scenario, with null destination shapefile null to retrieve vector isochrones
	analyst.singlePointRequest({
      lat : marker.lat,
      lng : marker.lng,
    }, defaultGraph, null, optionC[0])
    .then(function (response) {
      //then, if a comparison, run a second single-point request for new scenario, with null destination shapefile null to retrieve vector isochrones
	  if (compareTrue) { 
		vecComIsos = response.isochrones;
		analyst.singlePointRequest({
			lat : marker.lat,
			lng : marker.lng,
		}, defaultGraph, null, optionC[1])
		.then(function (response) {
			vectorIsos = response.isochrones;
			cb(response.key, true);
		}
	  )}
      else { 
		vectorIsos = response.isochrones; 
		cb(response.key, true);
	  }
    });
  };

  // swap between tile layer and vector isos layer
  this.showVectorIsos = function(timeVal, map) {
        currentIso = L.geoJson(isochrones[i], {
          style: {
            stroke      : true,
            fillColor   : '#FDB813',
            color       : '#F68B1F',
            weight      : 1,
            fillOpacity : 0.25,
            opacity     : 1
          }
        });
        currentIso.addTo(map);
      }

    if (vecComIsos) {
      var isosArray = vecComIsos.pointEstimate.features;
      for (var i=0; i<isosArray.length; i++) { 
        if (isosArray[i].properties.time == timeVal) { 
          compareIso = L.geoJson(isosArray[i], {
            style: {
              stroke      : true,
              fillColor   : '#89cff0',
              color       : '#45b3e7',
              weight      : 1,
              fillOpacity : 0.25,
              opacity     : 1
            }
          });
          compareIso.addTo(map);
        }
      }  
    }
  };

});






