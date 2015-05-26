var coaxsApp = angular.module('coaxsApp', ['coaxsFilters', 'ui.router', 'ui.bootstrap', 'leaflet-directive']);

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

  $scope.tabnav = '28';

  $scope.param_stations = {
    'Normal'   : 0,
    'Platform' : 1,
    'Full'     : 2,
  };


  // current scenario

  $scope.variationModel = {
    station : 0,
    peak    : {
      min : 5,
      sec : 0,
    },
    offpeak : {
      min : 10,
      sec : 0,
    },
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


  // get geojson files

  $http.get('/geojson/existing')
  .success(function(data, status) {
    leafletData.getMap('map_left').then(function(map) {
      $scope.layers_left.geojson['subways'] = L.geoJson(data, {
        style: function (feature) {
          return {
            color     : feature.properties.LINE,
            weight    : 2,
            opacity   : 0.5,
            dashArray : 0,
          };
        },
        onEachFeature: function (feature, layer) {
          layer.bindPopup(feature.properties.LINE + ' Line<br>' + feature.properties.ROUTE);
        }
      });
      $scope.layers_left.geojson['subways'].addTo(map);
    });
  });

  $http.get('/geojson/proposed')
  .success(function(data, status) {
    leafletData.getMap('map_left').then(function(map) {

      var exampleDir = {
        '0' : null,
        '1' : null,
      }

      var exampleAlt = {
        '0' : exampleDir,
        '1' : exampleDir,
        '2' : exampleDir,
        '3' : exampleDir,
      }

      $scope.layers_left.geojson['proposed'] = {
        '1' : exampleAlt,
        '2' : exampleAlt,
        '3' : exampleAlt,
        '4' : exampleAlt,
      }

      for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i].properties;
        $scope.layers_left.geojson['proposed'][feature.corId][feature.altId][feature.direction] = L.geoJson(data.features[i], {
          style: function (feature) {
            return {
              color     : '#' + feature.properties.routes_route_color,
              weight    : 3,
              opacity   : 0.1,
              dashArray : 0,
            };
          },
          onEachFeature: function (feature, layer) {
            (function(layer, properties) {
              $scope.allDetails = layer;
              layer.on("mouseover", function (e) {
                $scope.targetFeature = feature;
                console.log($scope.targetFeature);
                layer.setStyle({
                  opacity : 1,
                  weight  : 5,
                });
              });
              layer.on("mouseout", function (e) {
                layer.setStyle({
                  opacity : 0.1,
                  weight  : 3,
                }); 
              });
            })(layer, feature.properties);
          }
        })

        $scope.layers_left.geojson['proposed'][feature.corId][feature.altId][feature.direction].addTo(map);
      }
    });
  });

  $scope.$on("leafletDirectiveMap.geojsonMouseover", function(ev, leafletEvent) {
    console.log('f');
  });
  $scope.$on("leafletDirectiveMap.geojsonClick", function(ev, featureSelected, leafletEvent) {
    console.log('we');
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

  $scope.setTabnav = function (val) {
    $scope.tabnav = val;
  }

  $scope.subTime = function (tabnav, peak, timeval) {
    var value = null;
    
    if (peak) {
      value = $scope.scenario[tabnav].peak;
    } else {
      value = $scope.scenario[tabnav].offpeak;
    }

    if (value[timeval] > 1) {
      value[timeval] -= 1;
    } else if (value[timeval] == 1) {
      value[timeval] = 0
    } else {
      value[timeval] = 59
    }
  }

  $scope.addTime = function (tabnav, peak, timeval) {
    var value = null;
    
    if (peak) {
      value = $scope.scenario[tabnav].peak;
    } else {
      value = $scope.scenario[tabnav].offpeak;
    }

    if (value[timeval] < 59) {
      value[timeval] += 1;
    } else if (value[timeval] == 59) {
      if (timeval == 'min') {
        value[timeval] = 60
      } else {
        value[timeval] = 0
      }
    } else {
      value[timeval] = 0
    }
  }

});








