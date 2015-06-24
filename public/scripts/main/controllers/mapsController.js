coaxsApp.controller('mapsController', function ($scope, $state, leafletData, analystService, loadService, targetService, scorecardService, leftService, supportService) {

  // Management for current scenario
  var scenarioBase = {
    name     : null,
    station  : 0,
    routeId  : null,
    peak     : { min : 5,  sec : 0 },
    offpeak  : { min : 10, sec : 0 },
  }
  $scope.scenario = {
    'BH' : angular.copy(scenarioBase),
    'HP' : angular.copy(scenarioBase),
    'HD' : angular.copy(scenarioBase),
    'CT' : angular.copy(scenarioBase),
  }
  $scope.variants = {
    'BH' : { sel : null, all : {} },
    'HP' : { sel : null, all : {} },
    'HD' : { sel : null, all : {} },
    'CT' : { sel : null, all : {} },
  }
  $scope.combos = {
    sel : null,
    com : null,
    all : {},
  }

  // left globals
  var subwaysLayer    = null;
  var stopsLayer      = null;
  var routesLayer     = null;
  var poiUserPoints   = null;
  var existingMBTAKey = 'a10fbead-b6cf-4a32-8135-2ea465bf7466';
  $scope.loadProgress = {vis:false, val:0};
  $scope.vectorIsos   = {vis:false, val:12};

  // right globals
  var geoJsonRight = null;


  // Angular Leaflet Directiive - base components
  var defaults_global = {
    scrollWheelZoom    : true,
    zoomControl        : false,
    attributionControl : false,
  };
  var tiles_global = {
      name: 'CartoDB Light',
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png',
      type: 'xyz',
  };
  var center_global = {
    lat  : 42.360543,
    lng  : -71.058169,
    zoom : 12,
  };
  // Assembling left map
  $scope.defaults_right  = angular.copy(defaults_global);
  $scope.center_right    = angular.copy(center_global);
  $scope.tiles_right     = angular.copy(tiles_global);
  // Assembling right map
  $scope.defaults_left = angular.copy(defaults_global);
  $scope.center_left   = angular.copy(center_global);
  $scope.center_left.zoom = 11;
  $scope.tiles_left    = angular.copy(tiles_global);
  $scope.geojson_left  = null;
  $scope.markers_left  = {
    main: {
      lat       : $scope.center_left.lat,
      lng       : $scope.center_left.lng,
      draggable : true,
    }
  };
  // Left map listener
  $scope.$on('leafletDirectiveMarker.dragend', function (e, marker) { 
    // if (marker) {marker = {model : {lat: 42.3601, lng: 71.0589}}}
    animateProgressBar();
    leafletData.getMap('map_left').then(function(map) {
      analystService.resetAll(map, getKeepRoutes());
      analystService.singlePointRequest(marker, map, getCompareKey(), function (key) {
        addCompareKey(key);
      });
      analystService.vectorRequest(marker, function (result) {
        if (result) { 
          $scope.loadProgress.val = 100;
          setTimeout(function () { $scope.$apply (function () { $scope.loadProgress.vis = false }) }, 1000) 
        };
      });
    });
  });

  getKeepRoutes = function () {
    var keepRoutes = [];
    if ($scope.combos.sel) {
      var selectedCorridors = $scope.combos.all[$scope.combos.sel].sel;
      for (corridor in selectedCorridors) {
        var corridorData = $scope.variants[corridor].all[selectedCorridors[corridor]];
        if (corridorData) { keepRoutes.push(corridorData.routeId); }
      }
    }
    return keepRoutes;
  }

  getCompareKey = function () {
    if ($scope.combos.com && $scope.scenarioCompare) {
      var selectedCorridors = $scope.combos.all[$scope.combos.com].sel;
      console.log('$scope.combos.com && $scope.scenarioCompare');
    } 
    else if (!$scope.combos.com && $scope.scenarioCompare) { 
      console.log('NOT $scope.combos.com && $scope.scenarioCompare', existingMBTAKey);
      return existingMBTAKey;
    }
    else {
      console.log('return undef')
      return undefined;
    }
  }

  addCompareKey = function (key) {
    if ($scope.combos.sel) {
      console.log(add)
    } else {
      existingMBTAKey = key;
    }
  }

  animateProgressBar = function () {
    $scope.loadProgress = {vis:true, val:0};
    var runProgressBar = setInterval( function () {
      $scope.$apply( function () { 
        if ($scope.loadProgress.val > 98) {
          $scope.loadProgress.val = 100;
          clearInterval(runProgressBar);
        } else {
          $scope.loadProgress.val += Math.floor(Math.random()*3);
        }
      }); 
    }, 200)  
  }


  $scope.showVectorIsos = function (timeVal) { 
    leafletData.getMap('map_left').then(function (map) {
      if (!$scope.loadProgress.vis && $scope.showVectorIsosOn) { analystService.showVectorIsos(timeVal, map); };
    })
  }


  // initialize imported data - MAP LEFT
  leafletData.getMap('map_right').then(function (map) {
    loadService.getExisting(function (subways) {
      subways.addTo(map);
      subwaysLayer = subways;
    });

    loadService.getProposedRoutes(function(data) {
      routesLayer = data.layerGroup;
      routesLayer.addTo(map);

      $scope.routes = data.geoJsons;
      var routes = data.geoJsons;

      for (var key in routes) {
        var tabnavAlt = routes[key][0].options.base.corName;
        $scope.scenario[tabnavAlt].name = routes[key][0].options.base.varName;
        $scope.scenario[tabnavAlt].routeId = routes[key][0].options.base.routeId;
        var uuid = $scope.newVariant(tabnavAlt, false);
        if (routes[key][0].options.base.default || routes[key][1].options.base.default) {
          $scope.setSelectedVariant(tabnavAlt, uuid);
        }
      }
    });

    loadService.getProposedStops(function (stops) {
      stops.addTo(map);
      stopsLayer = stops;
    });
  });

  // initialize imported data - MAP RIGHT
  leafletData.getMap('map_left').then(function (map) {
    loadService.getExisting(function (subways) {
      subways.addTo(map);
      subwaysLayer = subways;
    });

    loadService.getUsersPoints(function (points, poiUsers) {
      $scope.poiUsers = poiUsers;
      poiUserPoints   = points;
      poiUserPoints.addTo(map);
    })
  })



  $scope.targetCorridor = function (id) {
    targetService.targetCorridor(routesLayer, id);
    targetService.targetStops(stopsLayer, null);
  }

  $scope.updateTargetFeature = function (routeId) {
    targetService.targetCorridor(routesLayer, routeId);
    targetService.targetStops(stopsLayer, routeId);
    if (routeId) {
      $scope.targetFeature = targetService.newTargetFeature(routeId, routesLayer);
    } else {
      $scope.targetFeature = {};
    }
  }

  $scope.newVariant = function (tabnav, autoSet) {
    var uuid = supportService.generateUUID();
    $scope.scenario[tabnav]['created'] = Date.now();
    $scope.variants[tabnav].all[uuid] = angular.copy($scope.scenario[tabnav]);
    $scope.scenario[tabnav] = angular.copy(scenarioBase);
    if (autoSet) { $scope.setSelectedVariant(tabnav, uuid); };
    return uuid;
  }

  $scope.setSelectedVariant = function (tabnav, uuid) {
    $scope.variants[tabnav].sel = uuid;
    if (uuid) {
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
  }

  $scope.updateLeftRoutes = function(comboId) {
    if (comboId) {
      leftService.updateLeftRoutes($scope.combos.all[comboId], $scope.variants, routesLayer, geoJsonRight, function(geoJson) {
        geoJsonRight = geoJson;
      });
      $scope.combos.sel = comboId;
    } else {
      leafletData.getMap('map_left').then(function(map) { map.removeLayer(geoJsonRight); });
      $scope.combos.sel = null;
      geoJsonRight      = null;
    }
  };

  $scope.newCombo = function (name) {
    var comboId = supportService.generateUUID();
    $scope.combos.all[comboId] = {
      name    : name,
      created : Date.now(),
      sel     : {
        'BH' : $scope.variants['BH'].sel,
        'HP' : $scope.variants['HP'].sel,
        'HD' : $scope.variants['HD'].sel,
        'CT' : $scope.variants['CT'].sel,
      }
    };
    $scope.updateLeftRoutes(comboId);
    $scope.combos.sel = comboId;
    $scope.comboName = null;
  }


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

  $scope.updateOffPeakVal = function (peakMin, tabnav) { 
    if (Number(peakMin) > Number($scope.scenario[tabnav].offpeak.min)) {
      $scope.scenario[tabnav].offpeak.min = peakMin;
    };
  }

  $scope.targetPOIUsers = function (id) { 
    if (id) { leftService.targetPOIUsers(poiUserPoints, id); }
    else { poiUserPoints.eachLayer( function (layer) { layer.setStyle({opacity : 1, fillOpacity : 1}); }) }
    $scope.currentPOIUser = id;
  }

  $scope.vectorTimeVal_add      = function () { if ($scope.showVectorIsosOn) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) + 1 }}
  $scope.vectorTimeVal_subtract = function () { if ($scope.showVectorIsosOn) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) - 1 }}

  $scope.toggleShowVectorIsos = function () {
    $scope.showVectorIsosOn = !$scope.showVectorIsosOn;
    leafletData.getMap('map_left').then(function (map) {
      if ($scope.showVectorIsosOn)  { analystService.showVectorIsos(300*$scope.vectorIsos.val, map); };
      if (!$scope.showVectorIsosOn) { analystService.resetAll(map); };
    })
  }



  $scope.test = function(foo) {
    console.log('running test');
    console.log(foo);
  }

});



