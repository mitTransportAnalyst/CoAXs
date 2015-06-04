coaxsApp.controller('mapsController', function ($scope, $state, leafletData, analystService, loadService, targetService) {

  // Management for current scenario
  $scope.variationModel = {
    name     : null,
    station  : 0,
    routeId  : null,
    peak     : {
      min : 5,
      sec : 0,
    },
    offpeak  : {
      min : 10,
      sec : 0,
    },
  }
  $scope.scenario = {
    'BH' : angular.copy($scope.variationModel),
    'HP' : angular.copy($scope.variationModel),
    'HD' : angular.copy($scope.variationModel),
    'CT' : angular.copy($scope.variationModel),
  }
  $scope.variants = {
    'BH' : [],
    'HP' : [],
    'HD' : [],
    'CT' : [],
  }


  // Angular Leaflet Directiive - base components
  var defaults_global = {
    scrollWheelZoom    : true,
    zoomControl        : false,
    attributionControl : false,
  };
  var center_global = {
    lat  : 42.360543,
    lng  : -71.058169,
    zoom : 12,
  };
  var layers_global = {
    baselayers: {
      carto_light: {
        name : 'CartoLight Basemap',
        url  : 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png',
        type : 'xyz'
      }
    }
  };
  // Assembling left map
  $scope.defaults_left  = angular.copy(defaults_global);
  $scope.center_left    = angular.copy(center_global);
  $scope.layers_left    = angular.copy(layers_global);
  $scope.markers_left   = [];
  // Assembling right map
  $scope.defaults_right = angular.copy(defaults_global);
  $scope.center_right   = angular.copy(center_global);
  $scope.layers_right   = angular.copy(layers_global);
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
  var subwaysLayer, stopsLayer, routesLayer;
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

  $scope.updateTargetFeature = function (properties) {
    var id = properties ? properties.routeId : null;
    targetService.targetCorridor(routesLayer, id);
    targetService.targetStops(stopsLayer, id);
    if (properties) {
      $scope.targetFeature = targetService.newTargetFeature($scope.routes, properties);
    } else {
      $scope.targetFeature = {};
    }
  }


  $scope.setScenario = function (tabnav, variant) {
    $scope.scenario[tabnav] = angular.copy(variant);
    $scope.scenario[tabnav].name = null;
  }

  $scope.newVariant = function (tabnav) {
    var tempCurrent = angular.copy($scope.scenario[tabnav]);
    $scope.variants[tabnav].push(tempCurrent);
    $scope.saveAlt = false;
    $scope.scenario[tabnav].name = null;
  }



});
