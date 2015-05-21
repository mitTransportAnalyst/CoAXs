var coaxsApp = angular.module('coaxsApp', ['ui.router', 'ui.bootstrap', 'leaflet-directive']);

coaxsApp.config(function($stateProvider, $urlRouterProvider) {
    
    $urlRouterProvider.otherwise('/maps');

    $stateProvider
        .state('maps', {
            url: '/maps',
            templateUrl: '/public/ng-views/maps.html',
            controller: 'mapsController'
        })
});

coaxsApp.service('analystService', function() {
    var Analyst = window.Analyst;
    var analyst = new Analyst(window.L, {
      apiUrl      : 'http://mit-analyst.dev.conveyal.com/api',
      tileUrl     : 'http://mit-analyst.dev.conveyal.com/tile',
      shapefileId : '0579b6bd8e14ec69e4f21e96527a684b_376500e5f8ac23d1664902fbe2ffc364',
      graphId     : '94de64a1a8762769b7d50d0bda3d5763',
      showIso     : true
    });
    var isoLayer = null

    this.dragendAction = function (marker, map) {
      analyst
      .singlePointRequest({
        'lat' : marker.model.lat,
        'lng' : marker.model.lng
      })
      .then(function (response) {
        if (isoLayer) {
          isoLayer.redraw();
        } else {
          isoLayer = response.tileLayer;
          isoLayer
          .addTo(map)
          .bringToFront()
        }
      })
      .catch(function (err) {
        console.log(err)
      })
    }
});

coaxsApp.controller('mapsController', function ($scope, $http, $state, leafletData, analystService) {

  // ui variables

  $scope.base = {
    'view_stations' : false,
    'view_rush'     : false,
    'view_off'      : false,
    'view_foo'      : false,
    'view_bar'      : false,
  }

  $scope.param_stations = {
    'Normal'   : 0,
    'Platform' : 1,
    'Full'     : 2,
  };


  // current scenario

  $scope.variationModel = {
    station : 0,
    peak    : 5.0,
    offpeak : 10.0,
  }

  $scope.scenario = {
    '28' : angular.copy($scope.variationModel),
    '32' : angular.copy($scope.variationModel),
    '66' : angular.copy($scope.variationModel),
    'CT' : angular.copy($scope.variationModel),
  }


  // basic views

  $scope.defaults_global = {
    scrollWheelZoom    : true,
    zoomControl        : false,
    attributionControl : false,
  };

  $scope.center_global = {
    lat  : 42.360543,
    lng  : -71.058169,
    zoom : 12,
  };

  $scope.layers_global = {
    baselayers: {
      carto_light: {
        name : 'Foo',
        url  : 'http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        type : 'xyz'
      }
    },
    overlays : {},
    geojson  : {},
  };


  // left map intial
  $scope.defaults_left  = angular.copy($scope.defaults_global);
  $scope.center_left    = angular.copy($scope.center_global);
  $scope.layers_left    = angular.copy($scope.layers_global);

  $scope.markers_left   = [];


  // right map intial
  $scope.defaults_right = angular.copy($scope.defaults_global);
  $scope.center_right   = angular.copy($scope.center_global);
  $scope.layers_right   = angular.copy($scope.layers_global);

  $scope.markers_right  = {
    main: {
      lat       : $scope.center_right.lat,
      lng       : $scope.center_right.lng,
      draggable : true,
    }
  };


  $scope.$on('leafletDirectiveMarker.dragend', function (e, marker) {
    leafletData.getMap('map_right').then(function(map) {
      analystService.dragendAction(marker, map);
    });
  });


  $http.get("/geojson/existing")
  .success(function(data, status) {
    leafletData.getMap('map_left').then(function(map) {
      $scope.layers_left.geojson['subways'] = L.geoJson(data, {
        style: function (feature) {
          return {
            color     : feature.properties.LINE,
            weight    : 1,
            opacity   : 1,
            dashArray : 1,
          };
        },
        onEachFeature: function (feature, layer) {
          layer.bindPopup(feature.properties.description);
        }
      });
      $scope.layers_left.geojson['subways'].addTo(map);
    });
  });

  $scope.baseToggle = function (menu) {
    angular.forEach($scope.base, function(value, key) {
      if (key == menu) {
        this[key] = !$scope.base[menu];
      } else {
        this[key] = false;
      }
    }, $scope.base);
  }

});
