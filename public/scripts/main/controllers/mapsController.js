coaxsApp.controller('mapsController', function ($http, $scope, $state, $interval, leafletData, analystService, d3Service, loadService, targetService, scorecardService, leftService, supportService) {

  // control screen size situation
  var runScreenSetUp = function () {
    if (window.innerHeight < 680 || window.innerWidth < 1280) {
      alert('Warning: This tool is designed for use on screens greater than 1280x680 pixels. Screen sizes smaller than this may have undesirable side effects.')
    }
    document.getElementById('leftDynamic').style.width = (window.innerWidth/2) - 275 + 'px';
    document.getElementById('rightDynamic1').style.width = (window.innerWidth/2) - (275 + 70 +1) + 'px';
  };
  runScreenSetUp();
  window.onresize = function(event) { runScreenSetUp(); };

  // Management for current scenario
  var scenarioBase = {
    name     : null,
    station  : 2,
    routeId  : null,
	num		 : null,
    peak     : { min : 15,  sec : 0 },
    offpeak  : { min : 30, sec : 0 },
  }

    var scenarioBaseBak = {
    name     : null,
    station  : 3,
    routeId  : null,
	num		 : null,
    peak     : { min : 2,  sec : 30 },
    offpeak  : { min : 4, sec : 0 },
  }
  
  $scope.selField = 'finan';
  $scope.indicator = {sel:'in_',all:{in_:'Jobs'}};
  $scope.scenarioLegend = true;
  $scope.selCordon = null;
  
  $scope.cordons = {};
  
  analystService.refreshCred();
  
  $interval(function () {
            analystService.refreshCred();
          } , 3540000);
  
  $scope.scenario = {
    'G' : angular.copy(scenarioBase),
	'T' : angular.copy(scenarioBase),
	'J' : angular.copy(scenarioBase),
	'E' : angular.copy(scenarioBase),
	'W' : angular.copy(scenarioBase),
	'B' : angular.copy(scenarioBaseBak),
  }
  $scope.variants = {
	'G' : { routeId : 'G1', sel : 0, all : {} },
	'T' : { routeId : 'T1', sel : 0, all : {} },
	'J' : { routeId : 'J1', sel : 0, all : {} },
	'E' : { routeId : 'E1', sel : 0, all : {} },
	'W' : { routeId : 'W1', sel : 0, all : {} },
	'B' : { routeId : 'B1', sel : 0, all : {} },
  }
  
  $scope.defaultsBuilt = false
  
  $scope.combos = {
    sel : null,
    com : null,
    all : {},
  }
  $scope.tabnav = 'G';
  $scope.mode = {
    accessEgress: { bike 	: [false,false]},
	transit: {		bus 	: [true,true],
					lu		: [true,true],
					lo      : [true,true],
					nr		: [true,true],}};
					
    // $scope.modeC = angular.copy(
	// all: [],
    // local: [3, 5, 6, 7],
    // bus: [0, 1, 3, 5, 6, 7],
    // walking: [0, 1, 2, 3, 4, 5, 6, 7],
    // selected: 'all'
  // }; -->
  
  // left globals
  var subwaysLayer    = null,
      subStopsLayer   = null,
      stopsLayer      = null,
      routesLayer     = null,
      poiUserPoints   = null,
      existingMBTAKey = null;

  $scope.snapPoints   = {all: [], sel: null, data: null},
  $scope.loadProgress = {vis:false, val:0};
  $scope.vectorIsos   = {vis:false, val:9};
  $scope.scenarioScore = {graphData: false};

  $scope.$watch('vectorIsos.val',
    function() {
		if ($scope.scenarioScore.graphData){
			drawGraph($scope.scenarioScore.graphData);
			!$scope.showVectorIsosOn ? $scope.toggleShowVectorIsos() : '';
			$scope.showVectorIsos(300*$scope.vectorIsos.val);
		};
  });
  
  // right globals
  var geoJsonLeft = null,
	priorityLayer = null;

  $scope.introPanel = true;

  // Angular Leaflet Directive - base components
  var defaults_global = {
    minZoom: 8,
    maxZoom: 18,
    scrollWheelZoom    : false,
    zoomControl        : true,
	zoomControlPosition: 'bottomright',
    attributionControl : false,
  };
  var maxBounds_global =  {
    northEast: {
      lat: 50,
      lng: -2
      },
    southWest: {
      lat: 53,
      lng:2}
  };
  
   var tilesDict = {
    all: {
		name: 'Blank',
		url: 'https://api.mapbox.com/styles/v1/ansoncfit/cioc4n55a00b6vemc85vgatj4/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYW5zb25jZml0IiwiYSI6IkVtYkNiRWMifQ.LnNJImFvUIYbeAT5SE3glA',
		type: 'xyz'
    },
	base: {
        name: 'Neighborhoods and Parks',
        url: 'https://api.mapbox.com/v4/ansoncfit.0bdb54c9/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYW5zb25jZml0IiwiYSI6IkVtYkNiRWMifQ.LnNJImFvUIYbeAT5SE3glA',
        type: 'xyz'
    },
	CH: {
        name: 'Crouch Hill',
        url: 'https://api.mapbox.com/styles/v1/ansoncfit/cioc1kjlb00b3vemccihbai9b/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYW5zb25jZml0IiwiYSI6IkVtYkNiRWMifQ.LnNJImFvUIYbeAT5SE3glA',
        type: 'xyz'
    },
	WP: {
        name: 'Woodgrange Park',
        url: 'https://api.mapbox.com/styles/v1/ansoncfit/cioc4djpn00bbbvnt2q24aqw9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYW5zb25jZml0IiwiYSI6IkVtYkNiRWMifQ.LnNJImFvUIYbeAT5SE3glA',
        type: 'xyz'
    }	
	
  }; 
  
  var tiles_global = tilesDict.base;
  
  var center_global = {
    lat  : 51.539431,
    lng  : 0.081417,
    zoom : 11,
  };
  // Assembling right map
  $scope.defaults_right  = angular.copy(defaults_global);
  $scope.maxBounds_right  = angular.copy(maxBounds_global);
  $scope.center_right    = angular.copy(center_global);
  $scope.tiles_right     = angular.copy(tilesDict.blank);
  // Assembling left map
  $scope.defaults_left = angular.copy(defaults_global);
  $scope.maxBounds_left  = angular.copy(maxBounds_global);
  $scope.center_left   = angular.copy(center_global);
  $scope.tiles_left    = angular.copy(tiles_global);
  $scope.geojson_left  = null;
  $scope.markers_left  = { main: { lat: $scope.center_left.lat, lng: $scope.center_left.lng, draggable : false }};

  // snap point sensitivity
  $scope.sensitivity = 0.05;

  $scope.changeTilesLeft = function(tiles) {
	if(tilesDict[tiles]){
	$scope.tiles_left = tilesDict[tiles];}
	else{$scope.tiles_left = tilesDict['base']}
  };
  
  $scope.changeTilesRight = function(tiles) {
	$scope.tiles_right = tilesDict[tiles];
  };
  
  // Handle left map queries
  $scope.$on('leafletDirectiveMarker.dragend', function (e, marker) { 
    $scope.markers_left.main.lat = marker.model.lat;
    $scope.markers_left.main.lng = marker.model.lng;
	console.log($scope.markers_left);
	$scope.setCordon(null);
  });

  $scope.preMarkerQuery = function () {
	d3Service.clearCharts();
	leafletData.getMap('map_left').then(function(map) {analystService.deleteTileIsos(map)});
	runMarkerQuerys();
  }
  
  //Vector Iso Autoplay timer
  $scope.timer = null;
  $scope.timerPlaying = false;
  
  $scope.startTimer = function () {
	$scope.timerPlaying = true;
	$scope.timer = $interval (function (){
	$scope.vectorTimeVal_add();
	$scope.showVectorIsos(300*$scope.vectorIsos.val);}, 1500);
  };
  
  $scope.stopTimer = function () {
    $scope.timerPlaying = false;
	if (angular.isDefined($scope.timer)) { $interval.cancel($scope.timer); }
  };
  
  var compareToSnapPoints = function () { 
    var sel = $scope.combos.sel;
    if (sel) {
      sel = $scope.combos.all[sel].sel;
      for (route in sel) { 
        if (sel[route] !== null) {
          return false;
        }
      };
      return true;
    } else {
      return true;
    }
  };

  var preloadedMarker = function (poi) {
    $scope.showVectorIsosOn = false;
    animateProgressBar();
    if (!$scope.scenarioScore) { $scope.updateScenarioScorecard(); };
    $scope.scenarioScore.graphData = {
      all: poi.graphData,
      sel: poi.graphData.dem_jobs
    };
    $scope.drawGraph($scope.scenarioScore.graphData);
    leafletData.getMap('map_left').then(function(map) {
      analystService.resetAll(map, 0);
      analystService.loadExisting(poi, map, function(result) {
        if (result) {
          $scope.loadProgress.val = 100;
          setTimeout(function () { $scope.$apply (function () {
            $scope.loadProgress.vis = false; // terminate progress bar viewport
          }) }, 1000);
        }
      });
    });
  }

  // what calls the SPA analysis and updates and tile and map components
  var runMarkerQuerys = function () {
    //remove isochrone overlay from map
	$scope.showVectorIsosOn = false;
    
	//get marker location, so that lat/lon can be sent to analyst
	var marker = angular.copy($scope.markers_left.main);

	//prepare scenario modifications
    this.runPrep = function (map, comboItem, c) {
	  analystService.resetAll(map, c);
	  
	  //if there is a combo specified
	  if ($scope.combos.all[comboItem]){
		//if the specified combo does not have a custom scenario request, prepare the scenario
	    if(!$scope.combos.all[comboItem].customAnalystRequest) {
	      var toKeep = getKeepRoutes(comboItem);
          analystService.modifyRoutes(toKeep, c);
          analystService.modifyDwells(toKeep, c);
          analystService.modifyFrequencies(toKeep, c);
	    }
	    //otherwise, use the specified scenario
		else{
	      analystService.prepCustomScenario($scope.combos.all[comboItem].customAnalystRequest,c);
		}
	  } else {
	      var toKeep = [{routeId:'bakerloo'},{routeId:'G0'},{routeId:'E0'}];
          analystService.modifyRoutes(toKeep, c);
	  }
	  analystService.modifyModes($scope.mode, c);
	  analystService.setScenarioNames(comboItem, c);
	};

    animateProgressBar(); // start the progress bar
    leafletData.getMap('map_left').then(function(map) {

      // logic for handling when scenario compare is turned on and there is a selected scenario to compare against
      if ($scope.combos.com && $scope.scenarioCompare) {
		console.log("running comparison...");
		this.runPrep(map, $scope.combos.com, 0);
		this.runPrep(map, $scope.combos.sel, 1);
		analystService.singlePointComparison(marker, map, $scope.selCordon, function(res, cres, plotData, cPlotData){
		if (plotData) { 
              if (!$scope.scenarioScore) { $scope.updateScenarioScorecard(); };
			//set the data for the cumulative plot to be an array of the responses for the selected and comparison combos.			 		  
			  $scope.scenarioScore.graphData = [
			  { 'id': $scope.combos.sel,
				'name': $scope.combos.all[$scope.combos.sel].name,
				'data': cPlotData},
			  {'id': $scope.combos.com,
				'name': $scope.combos.all[$scope.combos.com].name ,
				'data': plotData}
			];
              drawGraph($scope.scenarioScore.graphData);
		}; 
		
			
			analystService.vectorRequest(marker, true, $scope.selCordon, function (key, result) {
			console.log("vector Request done for key " + key);
            if (result) {
              $scope.loadProgress.val = 100;
              setTimeout(function () { $scope.$apply (function () {
                $scope.loadProgress.vis = false; // terminate progress bar viewport
              }) }, 1000)
            };
          })
			
		}
		);

      // logic if there is no scenario to compare against (if compare is on then compares against baseline, else just runs standard SPA)
      } else {
        this.runPrep(map, $scope.combos.sel, 0);
        analystService.killCompareIso(map);
        var compareKey = !$scope.combos.com && $scope.scenarioCompare ? existingMBTAKey : undefined;
		var shapefile = undefined;
        analystService.singlePointRequest(marker, map, $scope.selCordon, function (key, plotData) {
		  console.log("tile Request done for key " + key);
		  if (plotData) { 
            if (!$scope.scenarioScore) { $scope.updateScenarioScorecard(); };
            $scope.scenarioScore.graphData = [
				{'id': $scope.combos.sel ? $scope.combos.sel : 0,
				'name': $scope.combos.sel? $scope.combos.all[$scope.combos.sel].name : 'Existing',
				'data': plotData}
			];
            drawGraph($scope.scenarioScore.graphData);
		  };
          if (!$scope.combos.sel) { existingMBTAKey = key }; 
          analystService.vectorRequest(marker, false, $scope.selCordon, function (key, result) {
			console.log("vector Request done for key " + key);
            if (result) {
              $scope.loadProgress.val = 100;
              setTimeout(function () { $scope.$apply (function () {
                $scope.loadProgress.vis = false; // terminate progress bar viewport
              }) }, 1000)
            };
          });
        });
      }
    });
  }
  
  drawGraph = function (graphData){
	d3Service.drawGraph($scope.vectorIsos.val,graphData, $scope.indicator)
  }
  
  $scope.updateCutoff = function (newVal) {
	leafletData.getMap('map_left').then(function(map) {
	analystService.showVectorIsos(300*newVal, map)
	});
	d3Service.drawGraph(newVal, $scope.scenarioScore.graphData, $scope.indicator);
  }
  
  $scope.setCordon = function (cordonId) {
	$scope.selCordon = cordonId;
	targetService.targetCordons(cordonsLayer,cordonId);
	if ($scope.selCordon){
	//d3Service.drawCordonGraph($scope.cordons[$scope.selCordon].dataset);
			if ($scope.cordons[$scope.selCordon].centerLat && $scope.cordons[$scope.selCordon].centerLon){
			$scope.markers_left.main.lat = $scope.cordons[$scope.selCordon].centerLat;
			$scope.markers_left.main.lng = $scope.cordons[$scope.selCordon].centerLon;
			leafletData.getMap('map_left').then(function(map) {
		map.panTo([$scope.markers_left.main.lat, $scope.markers_left.main.lng]);})
			$scope.changeTilesLeft($scope.cordons[$scope.selCordon].customBasemap); 
	}} else {$scope.changeTilesLeft()}
	$scope.preMarkerQuery();
  }

  // left d3 on scenario scorecard
  $scope.selectGraphData = function (dataVal) {
	$scope.selField = dataVal;
	$scope.scenarioScore.graphData.sel = $scope.scenarioScore.graphData.all[dataVal];
    if ($scope.scenarioScore.graphData.com) {
      $scope.scenarioScore.graphData.com.sel = $scope.scenarioScore.graphData.com.all[dataVal];
	}
	d3Service.drawGraph($scope.vectorIsos.val,$scope.scenarioScore.graphData);  }
  

  // filter for routes that match with the desired corridor
  getKeepRoutes = function (selected) {
    var keepRoutes = [];
    if ($scope.combos.all[selected]) {
      var selectedCorridors = $scope.combos.all[selected].sel;
      for (corridor in selectedCorridors) {
        var corridorData = $scope.variants[corridor].all[selectedCorridors[corridor]];
        if (corridorData) { keepRoutes.push(corridorData); }
      }
    };
    return keepRoutes;
  }

  // handles logic for progress bar loading view
  animateProgressBar = function () {
    $scope.loadProgress = {vis:true, val:0};
    var runProgressBar = setInterval( function () {
      $scope.$apply(function () {
        if ($scope.loadProgress.val > 98) {
          $scope.loadProgress.val = 100;
          clearInterval(runProgressBar); // kill the animation bar process loop
        } else {
          $scope.loadProgress.val += Math.floor(Math.random()*2);
        }
      });
    }, 300)
  }

  // toggle the vectos isos for the left map
  $scope.showVectorIsos = function (timeVal) {
    leafletData.getMap('map_left').then(function (map) {
      if (!$scope.loadProgress.vis && $scope.showVectorIsosOn) { analystService.showVectorIsos(timeVal, map); };
    })
  }

  // initialize imported data - MAP LEFT (this all runs on load, call backs are used for asynchronous operations)
  leafletData.getMap('map_left').then(function (map) {
    // get mbta existing subway information
	// var gs = false;
    // loadService.getExisting(function (subways) {
      // subways.addTo(map);
      // subwaysLayer = subways;
	  // console.log(subwaysLayer);
    // },gs);

	// place stops over routes plots on map
    // loadService.getStops('/geojson/t_stops', function (stops) {
      // var stopTypeSizes = [200, 300, 400];
      // var circleList = [];
	  // var stationNameList = [];

      // stops.eachLayer(function (marker) {
        // var stationColor = marker.options.base.color,
		    // stationStroke = false,
            // stationLatLng = [marker._latlng.lat, marker._latlng.lng],
            // size = stopTypeSizes[marker.options.base.stopType]/(map.getZoom()^2),
            // strokeWeight = 20/(map.getZoom()^(1/10)),
			// stationName = marker.options.base.station
			
   
		// var stationNamePopup = L.popup({
			  // closeButton: false,
			  // className: 'station-sign'
			// }).setContent('<p style="background-color:'
            // +stationColor+';">'+stationName+'</p><br><p style="background-color: white;"></p>');

		// if (stationColor == null){stationColor = "#FFFFFF"; stationStroke = true;};

			
		// circleList.push(L.circle(stationLatLng, size, {
          // stroke: stationStroke,
		  // color: "#000000",
		  // weight: strokeWeight,
		  // opacity: 1,
          // fillColor: stationColor,
          // fillOpacity: 0.6,
		// }).bindPopup(stationNamePopup));
	    
	  // });
	
      // subStopsLayer = L.layerGroup(circleList);
      // subStopsLayer.addTo(map);
    // });
	
	
    // get priority portions (do this first so it renders beneath other content)
    loadService.getProposedPriorityLanes(function (priorityLanes) {
      priorityLanes.addTo(map);
	  priorityLayer = priorityLanes;
    })



    // place stops over routes plots on map
    // loadService.getStops('/geojson/proposed_stops', function (stops) {
      // stops.addTo(map);
      // stopsLayer = stops;
    // });
  });

  // initialize imported data - MAP RIGHT (this all runs on load, call backs are used for asynchronous operations)
  leafletData.getMap('map_left').then(function (map) {
    
	loadService.getCordons(function([cordonGeos, cordonData]){
		cordonGeos.addTo(map);
		cordonsLayer = cordonGeos;
		$scope.cordons = cordonData;
	});
	
	var gs=false;
    loadService.getExisting(function (subways) {
      subways.addTo(map);
      subwaysLayer = subways;
	  console.log(subways);
    }, gs);

	// place stops over routes plots on map
    loadService.getStops('/geojson/t_stops', function (stops) {
      var stopTypeSizes = [400, 600, 800];
      var circleList = [];
	  var stationNameList = [];

      stops.eachLayer(function (marker) {
        var stationColor = marker.options.base.color,
		    stationStroke = false,
            stationLatLng = [marker._latlng.lat, marker._latlng.lng],
            size = stopTypeSizes[marker.options.base.stopType]/(map.getZoom()^2),
            strokeWeight = 20/(map.getZoom()^(1/10)),
			stationName = marker.options.base.station
			
   
		var stationNamePopup = L.popup({
			  closeButton: false,
			  className: 'station-sign'
			}).setContent('<p style="background-color:'
            +stationColor+';">'+stationName+'</p><br><p style="background-color: white;"></p>');

		if (stationColor == null){stationColor = "#FFFFFF"; stationStroke = true;};

			
		circleList.push(L.circle(stationLatLng, size, {
          stroke: stationStroke,
		  color: "#000000",
		  weight: strokeWeight,
		  opacity: 1,
          fillColor: stationColor,
          fillOpacity: 0.9,
		}).bindPopup(stationNamePopup));
	    
	  });
	
      subStopsLayer = L.layerGroup(circleList);
      subStopsLayer.addTo(map);
    });
	
	    // now pull the proposed routes
    loadService.getProposedRoutes(function (data) {
	routesLayer = data.layerGroup;
      routesLayer.addTo(map);

      // rbind routes to scope
      $scope.routes = data.geoJsons;
      var routes = data.geoJsons;
      // iterate through routes and set the default scenario values
	  for (var key in routes) {
        var tabnavAlt = routes[key][0].options.base.corName;
        var rewind = angular.copy($scope.scenario[tabnavAlt]);
        $scope.scenario[tabnavAlt].name = routes[key][0].options.base.varName;
        $scope.scenario[tabnavAlt].routeId = routes[key][0].options.base.routeId;
        $scope.scenario[tabnavAlt].station = routes[key][0].options.base.defaultStationType;

        var isDefault = routes[key][0].options.base.default;
		var varIndex = routes[key][0].options.base.varId;
        $scope.newVariant(tabnavAlt, varIndex, isDefault);
        if (!isDefault) {
          $scope.scenario[tabnavAlt].name = rewind.name;
          $scope.scenario[tabnavAlt].routeId = rewind.routeId;
          $scope.scenario[tabnavAlt].station = rewind.station;
        };
      };
    });
	
    // load user points from phil's google spreadsheet
    
  });

  // highlight a corridor, all routes within
  $scope.targetCorridor = function (variant) {
    if(variant){
    targetService.targetCorridor(routesLayer, variant._key);
    targetService.targetStops(stopsLayer, null);
	targetService.targetPriority(priorityLayer, null);
	$scope.tabnav = variant._key;
	$scope.variants[$scope.tabnav].sel == null? $scope.routeScorecard=false : $scope.updateRouteScorecard($scope.scenario[$scope.tabnav].routeId, $scope.tabnav);}
  };

  // update a specific route within a corridor
  $scope.updateTargetFeature = function (variant) {
    var routeId = variant ? variant.routeId : undefined;
    var station = variant ? variant.station : 2;
    var routeColor = variant ? $scope.routes[variant.routeId][0].options.base.routeColor : undefined;
	if(routeId){
    targetService.targetCorridor(routesLayer, routeId);
    targetService.targetStops(stopsLayer, routeId, station, routeColor);
	targetService.targetPriority(priorityLayer, routeId);}
    if (routeId) {
      $scope.targetFeature = targetService.newTargetFeature(routeId, routesLayer);
    } else {
      $scope.targetFeature = {};
    }
  };

  // create a new route variant based off of existing scenario settings
  $scope.newVariant = function (tabnav, varId, autoSet) {
    var uuid = supportService.generateUUID();
    $scope.scenario[tabnav]['created'] = Date.now();
    $scope.variants[tabnav].all[uuid] = angular.copy($scope.scenario[tabnav]);
    if (autoSet) { 
      $scope.scenario[tabnav] = angular.copy(scenarioBase);
      $scope.setSelectedVariant(tabnav, uuid); 
    };
	$scope.variants[tabnav].all[uuid].num = varId;
    return uuid;
  };

  // take a selected variant and set that to current (able to be loaded as total scenario)
  $scope.setSelectedVariant = function (tabnav, uuid) {
    $scope.variants[tabnav].sel = uuid;
    if (uuid) {
      $scope.scenario[tabnav].num         = $scope.variants[tabnav].all[uuid].num + 1;
	  $scope.scenario[tabnav].name        = $scope.variants[tabnav].all[uuid].name;
      $scope.scenario[tabnav].station     = $scope.variants[tabnav].all[uuid].station;
      $scope.scenario[tabnav].routeId     = $scope.variants[tabnav].all[uuid].routeId;
      $scope.scenario[tabnav].peak.min    = $scope.variants[tabnav].all[uuid].peak.min;
      $scope.scenario[tabnav].peak.sec    = $scope.variants[tabnav].all[uuid].peak.sec;
      $scope.scenario[tabnav].offpeak.min = $scope.variants[tabnav].all[uuid].offpeak.min;
      $scope.scenario[tabnav].offpeak.sec = $scope.variants[tabnav].all[uuid].offpeak.sec;
    } else {
      $scope.scenario[tabnav].routeId = null;
    }
  };

  // set left default scenario to examine (for SPA or compare)
  $scope.updateLeftRoutes = function(comboId) {
    if (comboId) {
      leftService.updateLeftRoutes($scope.combos.all[comboId], $scope.variants, routesLayer, geoJsonLeft, function(geoJson) {
        geoJsonLeft = geoJson;
      });
      $scope.combos.sel = comboId;
    } else {
      leafletData.getMap('map_left').then(function(map) { 
        map.removeLayer(geoJsonLeft); 
        $scope.combos.sel = null;
        geoJsonLeft = null;
      });
    }
  };

  // create a new total scenario to send over to the left map
  $scope.newCombo = function (name) {
    var comboId = supportService.generateUUID();
    $scope.combos.all[comboId] = {
      name    : name,
      created : Date.now(),
      sel     : {
        'G' : $scope.variants['G'].sel,
		'T' : $scope.variants['T'].sel,
        'J' : $scope.variants['J'].sel,
		'E' : $scope.variants['E'].sel,
		'W' : $scope.variants['W'].sel,
		'B' : $scope.variants['B'].sel,
      }
    };
    $scope.updateLeftRoutes(comboId);
    $scope.combos.sel = comboId;
    $scope.comboName = null;
  }

  // how we update the scorecard on the right side, also bound to events like range slider
  $scope.updateRouteScorecard = function (routeId, tabnav) {
  }

  // updates on new selected scenario combo
  $scope.updateScenarioScorecard = function (id) {
  
    // if (!id) {
      // var tempScen = scorecardService.generateEmptyScore();
      // if ($scope.scenarioScore && $scope.scenarioScore.graphData) { 
        // tempScen.graphData = $scope.scenarioScore.graphData; 
      // }
      // $scope.scenarioScore = tempScen;
    // } else {
      // var allCorKeys = $scope.combos.all[id].sel;
      // var busTot = {count: 0, cost: 0};
      // var lenTot = {count: 0, cost: 0};
      // var vehTot = {count: 0, cost: 0};

      // for (cor in allCorKeys) {
        // var selCor = $scope.variants[cor].all[allCorKeys[cor]];

        // if (selCor) {
          // var bus       = scorecardService.generateBusScore(stopsLayer, selCor.station, selCor.routeId);
          // busTot.count += bus.count;
          // busTot.cost  += bus.cost;

          // var length    = scorecardService.generateLengthScore(routesLayer, selCor.routeId);
          // lenTot.count += length.count;
          // lenTot.cost  += length.cost;

          // var frequencies = {
            // peak : selCor.peak.min*60 + selCor.peak.sec,
            // off  : selCor.offpeak.min*60 + selCor.offpeak.sec,
          // };

          // var vehicles  = scorecardService.generateVehiclesScore(routesLayer, frequencies, selCor.routeId);
          // vehTot.count += vehicles.count;
          // vehTot.cost  += vehicles.cost;
        // }
      // }
      // if (!$scope.scenarioScore) { $scope.scenarioScore = {}; }
      // $scope.scenarioScore.bus = busTot; 
      // $scope.scenarioScore.length = lenTot; 
      // $scope.scenarioScore.vehicles = vehTot;
    // }
  }

  
  $scope.saveAltButton = function () {
    if($scope.saveAlt) {
	  $scope.newVariant($scope.tabnav,true);
	}
	$scope.saveAlt=!$scope.saveAlt;
  }
  // this is to control against having offpeak val lower than peak val
  $scope.updateOffPeakVal = function (peakMin, tabnav) {
    if (Number(peakMin) > Number($scope.scenario[tabnav].offpeak.min)) {
      $scope.scenario[tabnav].offpeak.min = peakMin;
    };
  }

  $scope.clearPOIUsers = function () {
    $scope.currentPOIUser = false;
	poiUserPoints.eachLayer( function (layer) { layer.setOpacity(0) });
  }
  
  $scope.targetPOIUsers = function (id) {
    $scope.currentPOIUser = id;
	if (id) { 
	leftService.targetPOIUsers(poiUserPoints, id); 
	$scope.poiUsers.forEach(function (user) {
	if (user.userId == id) {
		if (user.homeLoc[0] && user.homeLoc[1]){
			$scope.markers_left.main.lat = user.homeLoc[0];
			$scope.markers_left.main.lng = user.homeLoc[1];
		}
	}});
	$scope.preMarkerQuery();
	leafletData.getMap('map_left').then(function(map) {
		map.panTo([$scope.markers_left.main.lat, $scope.markers_left.main.lng]);
	});
	}
	else { 
	leafletData.getMap('map_left').then(function(map) {
		map.panTo([center_global.lat, center_global.lng]);
		analystService.resetAll(map);
	});	
	poiUserPoints.eachLayer( function (layer) { layer.setOpacity(1) })
	}
  };

  // holdover from before we had the range slider, still keeping around just incase we need again
  $scope.vectorTimeVal_add      = function () {if ($scope.showVectorIsosOn) { if(Number($scope.vectorIsos.val)<24) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) + 1} else {$scope.vectorIsos.val = 1}}}
  $scope.vectorTimeVal_subtract = function () {if ($scope.showVectorIsosOn && Number($scope.vectorIsos.val)>1) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) - 1 }}

  // switch between views of vector isos and map tiles if travel access
  $scope.toggleShowVectorIsos = function () {
	if($scope.scenarioScore.graphData){
	if (!$scope.loadProgress.vis){
      $scope.showVectorIsosOn = !$scope.showVectorIsosOn;
      leafletData.getMap('map_left').then(function (map) {
        if ($scope.showVectorIsosOn)  { analystService.showVectorIsos(300*$scope.vectorIsos.val, map); };
        if (!$scope.showVectorIsosOn) { analystService.resetAll(map, 0); };
      });
	}
  }};

  // MANAGER CONTROLS
  // from manager control run create
  $scope.buildScenarios = function(foo) {  
	//check if combos have already been created
		
	if(!$scope.defaultsBuilt){
	$scope.combos.all['baseline'] = {
      name    : 'Current Service',
      created : Date.now(),
      sel     : {
		'G' : Object.keys($scope.variants['G'].all)[2],
		'T' : null,
		'J' : null,
		'E' : Object.keys($scope.variants['E'].all)[0],
		'W' : null,
		'B' : null,
      }
    };
	
	$scope.combos.sel = 'baseline';

    $scope.combos.all['gob_ext'] = {
      name    : 'GOB Extension',
      created : Date.now(),
      sel     : {
		'G' : Object.keys($scope.variants['G'].all)[0],
		'T' : null,
		'J' : null,
		'E' : Object.keys($scope.variants['E'].all)[0],
		'W' : null,
		'B' : null,
      }
    };
	
    $scope.combos.all['gob_full_closure'] = {
      name    : 'GOB Full Closure',
      created : Date.now(),
      sel     : {
		'G' : null,
	    'T' : Object.keys($scope.variants['T'].all)[0],
		'J' : Object.keys($scope.variants['J'].all)[0],
		'E' : Object.keys($scope.variants['E'].all)[0],
		'W' : null,
		'B' : null,
      }
    };
	
    $scope.combos.all['ell_part_closure'] = {
      name    : 'ELL Part Closure',
      created : Date.now(),
      sel     : {
		'G' : Object.keys($scope.variants['G'].all)[2],
		'T' : null,
		'J' : null,
		'E' : Object.keys($scope.variants['E'].all)[1],
		'W' : Object.keys($scope.variants['W'].all)[0],
		'B' : null,
      },
	  // customAnalystRequest: {
		 // scenario: {
		  // name: 'ell_part_closure',
		  // modifications: [
		    // {type: 'remove-trip',
			 // agencyId: 'LO',
			 // routeId: ['G1','G2','J1','T1','E0'],
			 // tripId: null
			// },
			// {type: 'remove-trip',
			 // agencyId: 'ble',
			 // routeId: ['B0','B1'],
			 // tripId: null
			// }
		  // ]
		// }
	  // }
	};
	
    console.log($scope.variants);
	
  }
  $scope.defaultsBuilt = true;
  console.log($scope.combos);

  }

  $scope.setNewSnapCache = function (id) {
    $scope.managerOperations = true;
    $scope.snapPoints.sel = id;
    loadService.loadSnapCache(id)
    .then(function (data) {
      $scope.snapPoints.data = data
      $scope.managerOperations = false;
    })
  }

  // from manager control runautosync
  $scope.updateLocationCache = function (selId) {
    $scope.managerOperations = true;
    loadService.loadSnapCache(selId)
    .then(function (data) {
      var differences = 0;
      if (data) {
        data.forEach(function (each, index) {
          var match = 0;
          $scope.poiUsers.forEach(function (user) {
            user.points.forEach(function (point) {
              if (each.lat==point.lat && each.lng==point.lng) { match += 1; }
            });
          });
          if (match==0) {
            differences += 1;
            data.splice(index, 1);
          }
        });
      }
      if (differences > 0 || !data) {
        if (!data) { data = [] };
        $scope.poiUsers.forEach(function (user) {
          user.points.forEach(function (point) {
            var match = 0;
            data.forEach(function (each, index) {
              if (each.lat==point.lat && each.lng==point.lng) { match += 1; }
            });
            if (match==0) {
              data.push({ lat: point.lat, lng: point.lng, id: point.poiTag })
            }
          });
        });

        loadService.updateLocationCache(data, selId)
        .then(function (data) {
          if (data) { alert('Data has been updated. Refresh page.'); }
          $scope.managerOperations = false;
        })
      } else {
        alert('Data was not updated, no changes found');
        $scope.managerOperations = false;
      }
    })
  };

  // from manager control runautosync
  $scope.saveScenarioCache = function () {
    $scope.managerOperations = true;
    var name = prompt("Please enter a name to save the file as (no spaces or special characters).", "foobar");
    var desired = name.replace(/[^\w]/gi, '') + '.json';
    if ($scope.snapPoints.all.indexOf(desired) > -1) {
      alert('That name, ' + desired + ', already exists as a file. Try again.')
    } else {
      loadService.loadSnapCache('baseline.json')
      .then(function (data) {

        var runPrep = function (map, comboItem) {
          var toKeep = getKeepRoutes(comboItem);
          analystService.resetAll(map,c);
          analystService.modifyRoutes(toKeep,c);
          analystService.modifyDwells(toKeep,c);
          analystService.modifyFrequencies(toKeep,c);
          if ($scope.mode.selected != 'all') {
            analystService.modifyModes($scope.mode[$scope.mode.selected],c);
          }
        };

        var i = 0;
        var poiUpdateSequence = function () {
          leafletData.getMap('map_left').then(function(map) {
            runPrep(map, $scope.combos.sel);

            // welcome to callback hell
            analystService.singlePointRequest(data[i], map, undefined, function (key, subjects) {
              if (subjects) { 
                data[i]['graphData'] = subjects; 
                analystService.vectorRequest(data[i], false, function (result, isochrones) {
                  if (result) {
                    data[i]['isochrones'] = isochrones;
                    i += 1;
                    if (i < data.length) { poiUpdateSequence(); }
                    else {
                      var newPOIs = JSON.stringify(data);
                      var url = '/cachedLocs/' + desired;
                      $http.post(url, {newPOIs: newPOIs})
                      .success(function (data) {
                        alert('Datafile successfully produced');
                      }).error(function(data, status, headers, config) {
                        alert('Process failed. An error occurred during the iteration through points. Check console.');
                      });
                    }
                  };
                });
              }
            });
          });
        };
        poiUpdateSequence();
      });
    }
  };

  // from manager control run download
  $scope.downloadSession = function () {
    var comboAll = angular.copy($scope.combos.all);
    for (combo in comboAll) {
      combo = comboAll[combo].sel;
      for (cor in combo) {
        if (combo[cor]) {
          combo[cor] = $scope.variants[cor].all[combo[cor]];
        }
      }
    }
    var text = [JSON.stringify(comboAll)];
    var blob = new Blob(text, {type: "text/json;charset=utf-8"});
    saveAs(blob, "sessionSave.json");
  }


});
