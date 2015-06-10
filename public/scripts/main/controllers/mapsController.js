coaxsApp.controller('mapsController', function ($scope, $state, leafletData, analystService, loadService, targetService, rightService, supportService) {

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
  var subwaysLayer = null;
  var stopsLayer = null;
  var routesLayer = null;

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
  $scope.defaults_left  = angular.copy(defaults_global);
  $scope.center_left    = angular.copy(center_global);
  $scope.tiles_left     = angular.copy(tiles_global);
  // Assembling right map
  $scope.defaults_right = angular.copy(defaults_global);
  $scope.center_right   = angular.copy(center_global);
  $scope.tiles_right    = angular.copy(tiles_global);
  $scope.geojson_right  = null;
  $scope.markers_right  = {
    main: {
      lat       : $scope.center_right.lat,
      lng       : $scope.center_right.lng,
      draggable : true,
    }
  };
  // Right map listener
  $scope.$on('leafletDirectiveMarker.dragend', function (e, marker) {
    leafletData.getMap('map_right').then(function(map) {
      analystService.dragendAction(marker, map);
    });
  });


  // initialize imported data
  leafletData.getMap('map_left').then(function(map) {
    loadService.getExisting(function(subways) {
      subways.addTo(map);
      subwaysLayer = subways;
    });

    loadService.getProposedRoutes(function(routes) {
      routesLayer = routes.L;
      routesLayer.addTo(map);

      delete routes.L;
      $scope.routes = routes;

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

    loadService.getProposedStops(function(stops) {
      stops.addTo(map);
      stopsLayer = stops;
    });
  });


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
    $scope.variants[tabnav].all[uuid] = angular.copy($scope.scenario[tabnav]);
    $scope.scenario[tabnav] = angular.copy(scenarioBase);
    if (autoSet) { $scope.setSelectedVariant(tabnav, uuid); };
    return uuid;
  }

  $scope.setSelectedVariant = function (tabnav, uuid) {
    $scope.variants[tabnav].sel = uuid;
    $scope.scenario[tabnav].routeId = uuid ? $scope.variants[tabnav].all[uuid].routeId : null;
  }

  $scope.updateRightRoutes = function(comboId) {
    if (comboId) {
      rightService.updateRightRoutes($scope.combos.all[comboId], $scope.variants, routesLayer, geoJsonRight, function(geoJson) {
        geoJsonRight = geoJson;
      });
      $scope.combos.sel = comboId;
    } else {
      rightService.clearRightRoutes(geoJsonRight);
      $scope.combos.sel = null;
      geoJsonRight = null;
    }
  };

  $scope.newCombo = function (name) {
    var comboId = supportService.generateUUID();
    $scope.combos.all[comboId] = {
      name : name,
      sel  : {
        'BH' : $scope.variants['BH'].sel,
        'HP' : $scope.variants['HP'].sel,
        'HD' : $scope.variants['HD'].sel,
        'CT' : $scope.variants['CT'].sel,
      }
    };
    $scope.updateRightRoutes(comboId);
    $scope.combos.sel = comboId;
    $scope.comboName = null;
  }






  $scope.test = function(foo) {
    console.log('running test');
    console.log(foo);
  }

});



