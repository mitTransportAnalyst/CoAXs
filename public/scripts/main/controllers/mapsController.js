coaxsApp.controller('mapsController', function ($http, $scope, $state, $interval, leafletData, analystService, d3Service, loadService, targetService, scorecardService, leftService, supportService) {

  // control screen size situation
  var runScreenSetUp = function () {
    if (window.innerHeight < 680 || window.innerWidth < 1280) {
      alert('Warning: This tool is designed for use on screens greater than 1280x680 pixels. Screen sizes smaller than this may have undesirable side effects.')
    }
    document.getElementById('leftDynamic').style.width = (window.innerWidth)/2 - 350 + 'px';

    document.getElementById('service-tab').style.width = (window.innerWidth)/2 - 275 + 'px';


  };
  runScreenSetUp();
  window.onresize = function(event) { runScreenSetUp(); };


  $scope.users =
    [{name:"PD",homeLoc:[42.3752666,-71.112716],workLoc:[42.3601382,-71.0948792]},{name:"AS",homeLoc:[42.376542,-71.0994836],workLoc:[42.3601382,-71.0948792]}];

  // Management for current scenario
  var scenarioBase = {
    name     : null,
	  num		 : 0,
    station  : 2,
    routeId  : null,
    peak     : { min : 10,  sec : 0 },
    offpeak  : { min : 20, sec : 0 },
  };

  $scope.currentParam = {
    'A' : {dwell:0, headway:0, runningTime: 0},
    'B' : {dwell:0, headway:0, runningTime: 0},
    'C' : {dwell:0, headway:0, runningTime: 0},
    'D' : {dwell:0, headway:0, runningTime: 0},
    'E' : {dwell:0, headway:0, runningTime: 0}
  };

  $scope.scenario0 = {}; 
  $scope.scenario1 = {};
  $scope.scenarioCompare = false;
  $scope.pointToPoint = false;
  $scope.routeScorecard = false;
  $scope.indicators = {sel:'jobs',all:{jobs:'Jobs',workers:'Workers'}};
  $scope.scenarioLegend = true;
  $scope.selCordon = null;
  
  $scope.cordons = {};
    
  analystService.refreshCred();
  
  $interval(function () {
            analystService.refreshCred();
          } , 3540000);
  
  $scope.scenario = {
    'A' : angular.copy(scenarioBase),
	'B' : angular.copy(scenarioBase),
    'C' : angular.copy(scenarioBase),
    'D' : angular.copy(scenarioBase),
    'E' : angular.copy(scenarioBase),
	}

  $scope.variants = {
    'A' : { sel : 0, all : {}, color: '#555555',buslines:['1', 'CT1', '64'],corName: "Mass Ave"},
	  'B' : { sel : null, all : {}, color: '#7DD5ED', buslines:['111', '426', '428'],corName:"N. Washington St" },
    'C' : { sel : null, all : {}, color: '#F3E05E', buslines:['39', '66'], corName:"Huntington Ave" },
    'D' : { sel : null, all : {}, color: '#E092DF' , buslines:['30', '34', '34E', '35', '36', '37', '40', '50', '51'], corName:"Roslindale/Forest Hills" },
    'E' : { sel : 0 , all : {}, color: '#8D6AA8', buslines:['14', '19', '22', '23', '28', '29', '44', '45'], corName:"Blue Hill Ave" }
  };
  
    $scope.mode = {
    all: [],
    local: [3, 5, 6, 7],
    bus: [0, 1, 3, 5, 6, 7],
    walking: [0, 1, 2, 3, 4, 5, 6, 7],
    selected: 'all'
};
  
  $scope.combos = {
    sel : null,
    com : null,
    all : {},
}
  
  $scope.defaultsBuilt = false
  
  $scope.tabnav = 'A';
  
  // left globals
  var subwaysLayer_l    = null,
      subwaysLayer    = null,
      subStopsLayer   = null,
	  cordonsLayer 	  = null,
      stopsLayer      = null,
      routesLayer     = null,
      trunkLayer      = null,
      poiUserPoints   = null,
      existingMBTAKey = null;

  $scope.snapPoints   = {all: [], sel: null, data: null},
  $scope.loadProgress = {vis:false, val:0};
  $scope.vectorIsos   = {vis:false, val:30};
  $scope.scenarioScore = {loaded: false, data: []}; //Initialize the scenario scorecard with no data for the cumulative plot.

  $scope.$watch('vectorIsos.val',
    function(newVal) {
		if ($scope.scenarioScore.loaded){
			updateCutoff(newVal);
		};
  });

  
    // Angular Leaflet Directive - base components
  var defaults_global = {
    minZoom: 9,
    maxZoom: 18,
    scrollWheelZoom    : false,
    zoomControl        : true,
	zoomControlPosition: 'bottomright',
    attributionControl : false,
  };
  var maxBounds_global =  {
    northEast: {
      lat: 41.36,
      lng: -71.8
      },
    southWest: {
      lat: 43.36,
      lng:-70.3}
  };
  
   var tilesDict = {
    blank: {
		name: 'Blank',
		url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png',
		type: 'xyz'
    },
	base: {
        name: 'Neighborhoods and Parks',
        url: 'https://api.mapbox.com/v4/ansoncfit.0bdb54c9/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYW5zb25jZml0IiwiYSI6IkVtYkNiRWMifQ.LnNJImFvUIYbeAT5SE3glA',
        type: 'xyz'
    },
	collisions: {
        name: 'Collisions',
        url: 'https://api.mapbox.com/v4/ansoncfit.a18ea9ba/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYW5zb25jZml0IiwiYSI6IkVtYkNiRWMifQ.LnNJImFvUIYbeAT5SE3glA',
        type: 'xyz'
    }
  }; 
  
  var tiles_global = tilesDict.base;
  
  var center_global = {

   lat  : 42.35974896174244,
    lng  : -71.09368801116943,
    zoom : 12,
  };

  // Assembling right map
  $scope.defaults_right  = angular.copy(defaults_global);
  $scope.maxBounds_right  = angular.copy(maxBounds_global);
  $scope.center_right    = angular.copy(center_global);
  $scope.tiles_right     = angular.copy(tiles_global);

  // Assembling left map
  $scope.defaults_left = angular.copy(defaults_global);
  $scope.maxBounds_left  = angular.copy(maxBounds_global);
  $scope.center_left   = angular.copy(center_global);
  $scope.center_left_dest   = angular.copy(center_global);
  $scope.tiles_left    = angular.copy(tiles_global);
  $scope.geojson_left  = null;
  
  $scope.markers  = { 
	start: { 
		lat: $scope.center_left.lat, 
		lng: $scope.center_left.lng, 
		icon: {iconUrl: 'public/imgs/marker-flag-start-shadowed.png',
			   iconSize: [48,48],
			   iconAnchor: [46,40]
			   },
		draggable : true },
	end: { 
		lat: $scope.center_left_dest.lat, 
		lng: $scope.center_left.lng, 
		icon: {iconUrl: 'public/imgs/marker-flag-end-shadowed.png',
			   iconSize: [0,0],
			   iconAnchor: [46,40]
			   },
		draggable : true }
	};

  
  // handles logic for progress bar loading view
  animateProgressBar = function () {
    $scope.loadProgress = {vis:true, val:0};
	$scope.markers.start.draggable = false;
	$scope.markers.end.draggable = false;
	var stepValue = 150;
	if($scope.scenarioCompare){stepValue = 300} //it takes twice as long to load two scenarios.
    var runProgressBar = setInterval( function () {
      $scope.$apply(function () {
        if ($scope.loadProgress.val > 98) {
          $scope.loadProgress.val = 100;
          clearInterval(runProgressBar); // kill the animation bar process loop
        } else {
          $scope.loadProgress.val += Math.floor(Math.random()*2);
        }
      });
    }, stepValue)
  }
  finishProgressBar = function (){
    $scope.markers.start.draggable = true;
	$scope.markers.end.draggable = true;
	$scope.loadProgress.val = 100;
	
	setTimeout(function () { $scope.$apply (function () {
                 $scope.loadProgress.vis = false; // terminate progress bar viewport
              }) }, 200)
  }
  
  $interval(function () {
            analystService.refreshCred();
          } , 3540000);

  animateProgressBar();
  analystService.setDestinationData()
  .then(function (){analystService.fetchStopTreesAndGrids()
  .then(function (){finishProgressBar()})});
  
  loadService.getDestinationData('chartLabels',
	  function(data){d3Service.setChartLabels(data)}
  );


  
  // right globals
  var geoJsonLeft = null,
	priorityLayer = null;

  $scope.introPanel = true;
  
  $scope.togglePointToPoint = function() {
	$scope.pointToPoint = !$scope.pointToPoint
	$scope.resetMap();
	if ($scope.pointToPoint){
		$scope.markers.end.icon.iconSize = [48,48];
		leafletData.getMap('map_left').then(function(map) {
		  map.removeLayer(subStopsLayer);
		  map.removeLayer(subwaysLayer_l);
		})
	}else {
		$scope.markers.end.icon.iconSize = [0,0];
		leafletData.getMap('map_left').then(function(map) {
		  map.addLayer(subStopsLayer);
		  map.addLayer(subwaysLayer_l);
		})
	}
  };

  // snap point sensitivity
  $scope.sensitivity = 0.05;

  $scope.changeTilesLeft = function(tiles) {
	$scope.tiles_left = tilesDict[tiles];
  };
  
  $scope.changeTilesRight = function(tiles) {
	$scope.tiles_right = tilesDict[tiles];
  };
  
  $scope.resetMap = function() {
    $scope.scenarioLegend = false;
	d3Service.clearCharts();
	$scope.stopTimer();
	$scope.scenarioScore.loaded = false;
	$scope.scenarioScore.data = [];
    leafletData.getMap('map_left').then(function(map) {
		  analystService.resetAll(map);
	})
  }
  
  setScenarioScoreData = function (plotData) {
    $scope.scenarioScore.loaded = true;
		  var name = [];
		  var sel = $scope.combos.sel;
		  var com = $scope.combos.com;
		  
		  sel ? name[0] = $scope.combos.all[sel].name : name[0] = 'Baseline';
		  com ? name[1] = $scope.combos.all[com].name : name[0] = 'Baseline';
	
	for (var i = 0; i < plotData.length; i ++){
		  $scope.scenarioScore.data[i] =
			{'name': name[i],
			 'data': plotData[i]};
    };
  }
  
  refreshOrigin = function (marker){
    animateProgressBar();
		$scope.resetMap();
		var scenariosToSend = [];
		$scope.scenarioCompare ? scenariosToSend = [$scope.scenario0, $scope.scenario1] : scenariosToSend = [$scope.scenario0];
		analystService.moveOrigin(marker, scenariosToSend, $scope.scenarioCompare, $scope.pointToPoint).then(function(plotData){
		  finishProgressBar();
		  if(!$scope.pointToPoint){
		    setScenarioScoreData(plotData);
			drawGraph();
		    $scope.showVectorIsosOn = true;
		    $scope.loadProgress.vis = false;
			$scope.scenarioLegend = true;
		    $scope.showVectorIsos($scope.vectorIsos.val);
		  }else{
		    refreshDestination(L.marker([$scope.markers.end.lat,$scope.markers.end.lng]));
		  }
		})
  };
  
  refreshDestination = function(marker){
  //$scope.resetMap();
  leafletData.getMap('map_left').then(function(map) {
		  analystService.moveDestination(
		  function(plotData){
		  if (!plotData){
		    refreshOrigin(L.marker([$scope.markers.start.lat,$scope.markers.start.lng])) //we didn't get plot data, probably because an origin hasn't been set for point-to-point routing
		  } else {
		  setScenarioScoreData(plotData);
		  d3Service.drawTimeGraph($scope.scenarioScore.data);	
		}
		},
		  marker, $scope.scenarioCompare, map)
		})
  };
  
  // Handle left map queries
  $scope.$on('leafletDirectiveMarker.dragend', function (e, marker) { 
	
	if (marker.modelName == 'start'){
	  refreshOrigin(marker.leafletObject);
	}
	
	if (marker.modelName == 'end'){
	  refreshDestination(marker.leafletObject);
	}
	
	$scope.markers[marker.modelName].lat = marker.model.lat;
    $scope.markers[marker.modelName].lng = marker.model.lng;
    $scope.setCordon(null);
	//$scope.preMarkerQuery(); 
  });

  $scope.preMarkerQuery = function () {
    $scope.resetMap();
	  refreshOrigin(L.marker([$scope.markers.start.lat,$scope.markers.start.lng]));
  }
  
  //Vector Iso Autoplay timer
  $scope.timer = null;
  $scope.timerPlaying = false;
  
  $scope.startTimer = function () {
  if ($scope.scenarioScore.loaded){
	$scope.timerPlaying = true;
	$scope.timer = $interval (function (){
	$scope.vectorTimeVal_add();
	$scope.showVectorIsos($scope.vectorIsos.val);}, 150);
  }};
  
  $scope.stopTimer = function () {
    $scope.timerPlaying = false;
	if (angular.isDefined($scope.timer)) { $interval.cancel($scope.timer); }
  };
  
  drawGraph = function (){
	var plotData = [];
	$scope.scenarioScore.data.map(function(scen){
	  plotData.push({
	    name: scen.name,
		data: scen.data[$scope.indicators.sel]
	  })
	});	
	d3Service.drawGraph($scope.vectorIsos.val,plotData, $scope.indicators)
  }
  
  $scope.drawGraph = drawGraph;
  
  updateCutoff = function (cutoff) {
	$scope.showVectorIsos(cutoff);
	drawGraph();
  }

  $scope.setCordon = function (cordonId) {
	$scope.selCordon = cordonId;
	d3Service.clearCharts();
	targetService.targetCordons(cordonsLayer,cordonId);
	if ($scope.selCordon){
	d3Service.drawCordonGraph($scope.cordons[$scope.selCordon].dataset);
			if ($scope.cordons[$scope.selCordon].centerLat && $scope.cordons[$scope.selCordon].centerLon){
			$scope.markers.start.lat = $scope.cordons[$scope.selCordon].centerLat;
			$scope.markers.start.lng = $scope.cordons[$scope.selCordon].centerLon;
			leafletData.getMap('map_left').then(function(map) {
		map.panTo([$scope.markers.start.lat, $scope.markers.start.lng]);})
			$scope.preMarkerQuery();
		
	}}
  }

  // left d3 on scenario scorecard
  $scope.selectGraphData = function (dataVal) {
	$scope.indicators.sel = dataVal;
	drawGraph($scope.scenarioScore.data);
  }

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

  // toggle the vectos isos for the left map
  $scope.showVectorIsos = function (timeVal) {
    leafletData.getMap('map_left').then(function (map) {
      if (!$scope.loadProgress.vis && $scope.showVectorIsosOn && !$scope.pointToPoint) { analystService.showVectorIsos(timeVal, map, $scope.scenarioCompare); };
    })
  }

  // initialize imported data - MAP LEFT (this all runs on load, call backs are used for asynchronous operations)
  leafletData.getMap('map_right').then(function (map) {
    // get mbta existing subway information
	var gs = true;
    loadService.getExisting(function (subways) {
      subways.addTo(map);
      subwaysLayer = subways;
    },gs);
	
	// place stops over routes plots on map
    loadService.getStops('/geojson/t_stops', function (stops) {
      var stopTypeSizes = [200, 250, 300];
      var circleList = [];
	  var stationNameList = [];

      stops.eachLayer(function (marker) {
        var stationColor = marker.options.base.color,
		    stationStroke = false,
            stationLatLng = [marker._latlng.lat, marker._latlng.lng],
            size = stopTypeSizes[marker.options.base.stopType]/(map.getZoom()),
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
          fillOpacity: 0.6,
		}).bindPopup(stationNamePopup));
	    
	  });
	
      subStopsLayer = L.layerGroup(circleList);
      subStopsLayer.addTo(map);
    });
	
    //
    // // get priority portions (do this first so it renders beneath other content)
    // loadService.getProposedPriorityLanes(function (priorityLanes) {
      // priorityLanes.addTo(map);
    // priorityLayer = priorityLanes;
    // })

    // now pull the proposed routes
    loadService.getProposedRoutes(function (data) {
      routesLayer = data.layerGroup;
      routesLayer.addTo(map);

      // rbind routes to scope
      $scope.routes = data.geoJsons;
      var routes = data.geoJsons;

    }, $scope.variants);


    loadService.getTrunk(function (data) {
      trunkLayer = data.layerGroup;
      trunkLayer.addTo(map);

      // rbind routes to scope
      $scope.routes = data.geoJsons;
      var routes = data.geoJsons;

    },$scope.variants);

    // place stops over routes plots on map
    loadService.getStops('/geojson/proposed_stops', function (stops) {
      stops.addTo(map);
      stopsLayer = stops;
    });
  });

  // initialize imported data - MAP RIGHT (this all runs on load, call backs are used for asynchronous operations)
  leafletData.getMap('map_left').then(function (map) {
	
	loadService.getCordons(function([cordonGeos, cordonData]){
		cordonGeos.addTo(map);
		cordonsLayer = cordonGeos;
		$scope.cordons = cordonData;
	});

	loadService.getTrunk(function (data) {
      trunkLayer = data.layerGroup;
      trunkLayer.addTo(map);

      // rbind routes to scope
      $scope.routes = data.geoJsons;
      var routes = data.geoJsons;

    },$scope.variants);
	
    loadService.getExisting(function (subways) {      
      subwaysLayer_l = subways;
	  subwaysLayer_l.addTo(map);
    });

	//place stops over routes plots on map
    loadService.getStops('/geojson/t_stops', function (stops) {
      var stopTypeSizes = [200, 250, 300];
      var circleList = [];
	  var stationNameList = [];

      stops.eachLayer(function (marker) {
        var stationColor = marker.options.base.color,
		    stationStroke = false,
            stationLatLng = [marker._latlng.lat, marker._latlng.lng],
            size = stopTypeSizes[marker.options.base.stopType]/(map.getZoom()),
            strokeWeight = 20/(map.getZoom()^(1/10)),
			stationName = marker.options.base.station;


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

    // load user points from phil's google spreadsheet

  });

  // highlight a corridor, all routes within
  $scope.targetCorridor = function (variant) {
    targetService.targetCorridor(routesLayer, trunkLayer ,variant._key);
    // targetService.targetStops(stopsLayer, null);
	// targetService.targetPriority(priorityLayer, null);
	$scope.tabnav = variant._key;
	$scope.variants[$scope.tabnav].sel = true;
  };

  //highlight a busline
  $scope.targetBusline = function (busline) {

    targetService.targetBusline(routesLayer,busline);
  };

  // create a new route variant based off of existing scenario settings
  $scope.newVariant = function (tabnav, autoSet) {
    var uuid = supportService.generateUUID();
    $scope.scenario[tabnav]['created'] = Date.now();
    $scope.variants[tabnav].all[uuid] = angular.copy($scope.scenario[tabnav]);
    if (autoSet) { 
      $scope.scenario[tabnav] = angular.copy(scenarioBase);
      $scope.setSelectedVariant(tabnav, uuid); 
    };
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

  $scope.saveScenarioNum = 2;
  // create a new total scenario to send over to the left map
  $scope.newCombo = function () {
    // var comboId = supportService.generateUUID();
    $scope.combos.all[$scope.saveScenarioNum] = {
      name    : "New " + $scope.saveScenarioNum,
      created : Date.now(),
      sel     : {
     //    'A' : $scope.variants['A'].sel,
		// 'B' : $scope.variants['B'].sel,
     //    'C' : $scope.variants['C'].sel,
     //    'D' : $scope.variants['D'].sel,
     //    'I' : $scope.variants['I'].sel,
      },
      param:{}
    };
    // $scope.combos.sel = comboId;
    // $scope.comboName = null;
    $scope.combos.all[$scope.saveScenarioNum].param = angular.copy($scope.currentParam);
    $scope.saveScenarioNum += 1;
  }

  // how we update the scorecard on the right side, also bound to events like range slider
  $scope.updateRouteScorecard = function (routeId, tabnav) {
  if (!routeId && !tabnav) {
      $scope.routeScore = scorecardService.generateEmptyScore();
    } else {
      var frequencies = {
        peak : $scope.scenario[tabnav].peak.min*60 + $scope.scenario[tabnav].peak.sec,
        off  : $scope.scenario[tabnav].offpeak.min*60 + $scope.scenario[tabnav].offpeak.sec,
      };
      var bus      = scorecardService.generateBusScore(stopsLayer, $scope.scenario[tabnav].station, routeId);
      var length   = scorecardService.generateLengthScore(routesLayer, routeId);
      var time     = scorecardService.generateTimeScore(routesLayer, routeId);
      var vehicles = scorecardService.generateVehiclesScore(routesLayer, frequencies, routeId);
      $scope.routeScore = { bus: bus, length: length, time: time, vehicles: vehicles };
} 
  }

  // updates on new selected scenario combo
  $scope.updateScenarioScorecard = function (id) {
    if (!id) {
      var tempScen = scorecardService.generateEmptyScore();
      if ($scope.scenarioScore && $scope.scenarioScore.graphData) { 
        tempScen.graphData = $scope.scenarioScore.graphData; 
      }
      $scope.scenarioScore = tempScen;
    } else {
      var allCorKeys = $scope.combos.all[id].sel;
      var busTot = {count: 0, cost: 0};
      var lenTot = {count: 0, cost: 0};
      var vehTot = {count: 0, cost: 0};

      for (cor in allCorKeys) {
        var selCor = $scope.variants[cor].all[allCorKeys[cor]];

        if (selCor) {
          var bus       = scorecardService.generateBusScore(stopsLayer, selCor.station, selCor.routeId);
          busTot.count += bus.count;
          busTot.cost  += bus.cost;

          var length    = scorecardService.generateLengthScore(routesLayer, selCor.routeId);
          lenTot.count += length.count;
          lenTot.cost  += length.cost;

          var frequencies = {
            peak : selCor.peak.min*60 + selCor.peak.sec,
            off  : selCor.offpeak.min*60 + selCor.offpeak.sec,
          };

          var vehicles  = scorecardService.generateVehiclesScore(routesLayer, frequencies, selCor.routeId);
          vehTot.count += vehicles.count;
          vehTot.cost  += vehicles.cost;
        }
      }
      if (!$scope.scenarioScore) { $scope.scenarioScore = {}; }
      $scope.scenarioScore.bus = busTot; 
      $scope.scenarioScore.length = lenTot; 
      $scope.scenarioScore.vehicles = vehTot;
    }
  }

  //save
  $scope.saveAltButton = function () {






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
    console.log(id);
	// if (id) {
	// leftService.targetPOIUsers(poiUserPoints, id);

  $scope.markers.start.lat = $scope.users[id].homeLoc[0];
  $scope.markers.start.lng = $scope.users[id].homeLoc[1];


	// $scope.poiUsers.forEach(function (user) {
	// if (user.userId == id) {
	// 	if (user.homeLoc[0] && user.homeLoc[1]){
	// 		$scope.markers_left.main.lat = user.homeLoc[0];
	// 		$scope.markers_left.main.lng = user.homeLoc[1];
	// 	}
	// }});

	// $scope.preMarkerQuery();
	// leafletData.getMap('map_left').then(function(map) {
	// 	map.panTo([$scope.markers_left.main.lat, $scope.markers_left.main.lng]);
	// });
	// }
	// else {
	// leafletData.getMap('map_left').then(function(map) {
	// 	map.panTo([center_global.lat, center_global.lng]);
	// 	$scope.resetMap();
	// });
	// poiUserPoints.eachLayer( function (layer) { layer.setOpacity(1) })
	// }
  };



  // increment isochrones by 5 minutes
  $scope.vectorTimeVal_add      = function () {if ($scope.showVectorIsosOn) { if(Number($scope.vectorIsos.val)<119) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) + 1 } else {$scope.vectorIsos.val = 1}}}
  $scope.vectorTimeVal_subtract = function () {if ($scope.showVectorIsosOn && Number($scope.vectorIsos.val)>1) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) -1 }}

  // switch between views of vector isos and map tiles if travel access
  $scope.toggleShowVectorIsos = function () {
	if($scope.scenarioScore.loaded){
	if (!$scope.loadProgress.vis){
      $scope.showVectorIsosOn = !$scope.showVectorIsosOn;
		leafletData.getMap('map_left').then(function (map) {
        if ($scope.showVectorIsosOn)  { analystService.showVectorIsos($scope.vectorIsos.val, map); }
        else { analystService.resetAll(map, 0); };
      });
	}
  }};











  // MANAGER CONTROLS
  // from manager control run create
  $scope.buildScenarios = function(foo) {  
	//check if combos have already been created
	for (prop in $scope.combos.all) {$scope.defaultsBuilt = true;}
	
	if(!$scope.defaultsBuilt){
	var comboId = supportService.generateUUID();
    $scope.combos.all[0] = {
      name    : 'BASELINE',
      created : Date.now(),
      sel     : {
      },
      param   : {
        'A' : {dwell:0, headway:0, runningTime: 0},
        'B' : {dwell:0, headway:0, runningTime: 0},
        'C' : {dwell:0, headway:0, runningTime: 0},
        'D' : {dwell:0, headway:0, runningTime: 0},
        'E' : {dwell:0, headway:0, runningTime: 0}
      }
    };
    var comboId = supportService.generateUUID();
    $scope.combos.all[1] = {
      name    : 'UPGRADES',
      created : Date.now(),
      sel     : {

      },
      param   : {
        'A' : {dwell:40, headway:25, runningTime: 40},
        'B' : {dwell:40, headway:25, runningTime: 40},
        'C' : {dwell:40, headway:25, runningTime: 40},
        'D' : {dwell:40, headway:25, runningTime: 40},
        'E' : {dwell:40, headway:25, runningTime: 40}
      }
	};
	
	  
};


  $scope.defaultsBuilt = true;
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

  
  $scope.letters = ['A','B','C','D','E'];


  $scope.updateSelectScenario = function (comboIndex) {
    $scope.resetMap();
	var currentModificationJSON = [];

    $scope.letters.forEach(function (key){

      var tempNum =  (100-$scope.combos.all[comboIndex].param[key].dwell)/100;
      console.log(tempNum);

      analystService.modifyDwells(key,tempNum,function(modifyJSON){
        modifyJSON.forEach(function (route) {
          currentModificationJSON.push(route);
        });
      });
    })
	
    $scope.letters.forEach(function (key){

      var tempNum =  1/((100-$scope.combos.all[comboIndex].param[key].runningTime)/100);
      console.log(tempNum);

      analystService.modifySpeed(key,tempNum,function(modifyJSON){
        modifyJSON.forEach(function (route) {
          currentModificationJSON.push(route);
        });
      });
    });


    $scope.letters.forEach(function (key){

      var tempNum =  (100-$scope.combos.all[comboIndex].param[key].headway)/100;
      console.log(tempNum);

      analystService.modifyHeadway(key,tempNum,function(modifyJSON){
        modifyJSON.forEach(function (route) {
          currentModificationJSON.push(route);
        });
      });
    });


    $scope.scenario0.modifications = currentModificationJSON;

    console.log($scope.scenario0);

  }



  $scope.updateComScenario = function (comboIndex) {
    $scope.resetMap();
	var currentModificationJSON = [];

    $scope.letters.forEach(function (key){

      var tempNum =  (100-$scope.combos.all[comboIndex].param[key].dwell)/100;
      console.log(tempNum);
	  
      analystService.modifyDwells(key,tempNum,function(modifyJSON){
        modifyJSON.forEach(function (route) {
          currentModificationJSON.push(route);
        });
      });
    })


    $scope.letters.forEach(function (key){

      var tempNum =  1/((100-$scope.combos.all[comboIndex].param[key].runningTime)/100);
      console.log(tempNum);

      analystService.modifySpeed(key,tempNum,function(modifyJSON){
        modifyJSON.forEach(function (route) {
          currentModificationJSON.push(route);
        });
      });
    });


    $scope.letters.forEach(function (key){

      var tempNum =  (100-$scope.combos.all[comboIndex].param[key].headway)/100;
      console.log(tempNum);

      analystService.modifyHeadway(key,tempNum,function(modifyJSON){
        modifyJSON.forEach(function (route) {
          currentModificationJSON.push(route);
        });
      });
    });


    $scope.scenario1.modifications = currentModificationJSON;

    console.log($scope.scenario1);

  }
  

});
