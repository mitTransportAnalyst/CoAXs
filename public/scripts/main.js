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
    'view_freq'     : false,
    'view_scenario' : false,
  }

  $scope.tabnav = 'BH';

  $scope.targetFeature = {
    'properties'   : {},
    'alternatives' : {},
  }


  // current scenario

  $scope.variationModel = {
    name     : null,
    station  : 0,
    route_id : null,
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


  // basic leaflet angular directive view models

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
        url  : 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png',
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
        '0' : {
          'leaflet' : null,
          'base'    : null,
        },
        '1' : {
          'leaflet' : null,
          'base'    : null,
        },
      }

      var exampleAlt = {
        '0' : JSON.parse(JSON.stringify(exampleDir)),
        '1' : JSON.parse(JSON.stringify(exampleDir)),
        '2' : JSON.parse(JSON.stringify(exampleDir)),
        '3' : JSON.parse(JSON.stringify(exampleDir)),
      }

      $scope.layers_left.geojson['proposed'] = {
        '1' : JSON.parse(JSON.stringify(exampleAlt)),
        '2' : JSON.parse(JSON.stringify(exampleAlt)),
        '3' : JSON.parse(JSON.stringify(exampleAlt)),
        '4' : JSON.parse(JSON.stringify(exampleAlt)),
      }

      var geojsonList = [];

      for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i].properties; console.log(feature);
        $scope.layers_left.geojson['proposed'][feature.corId][feature.altId][feature.direction]['leaflet'] = L.geoJson(data.features[i], {
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
              layer.on("mouseover", function (e) {
                $scope.updateTargetFeature(feature.properties);
              });
            })
            (layer, feature.properties);
          },
          base: feature,
        })
        geojsonList.push($scope.layers_left.geojson['proposed'][feature.corId][feature.altId][feature.direction]['leaflet']);
      }
      $scope.routesLayer = L.layerGroup(geojsonList)
      $scope.routesLayer.addTo(map);
    });
  });

  $http.get('/geojson/proposed_stops')
  .success(function(data, status) {
    leafletData.getMap('map_left').then(function(map) {
      var stopList = [];
      var stopicon_base = L.Icon.extend({
        options : {
          iconUrl      :     'public/imgs/stop.png',
          iconSize     :     [16, 18],
          iconAnchor   :     [8, 18],
          popupAnchor  :     [0, -15],
          className    :     'icon-off',
        }
      });
      var stopicon = new stopicon_base();

      for (var i=0; i<data.features.length; i++) {
        var stop = data.features[i];
        stopList.push(L.marker([stop.properties.stop_lat, stop.properties.stop_lon], {
          'icon'        : stopicon,
          'riseOnHover' : true,
          'base'        : stop.properties,
        }))
      }
      $scope.stopsLayer = L.layerGroup(stopList);
      $scope.stopsLayer.addTo(map); 
    });
  });

  $scope.updateTargetFeature = function (properties) {
    var stopicon_base = L.Icon.extend({
      options : {
        iconUrl      :     'public/imgs/stop.png',
        iconSize     :     [16, 18],
        iconAnchor   :     [8, 18],
        popupAnchor  :     [0, -15],
        className    :     'icon-off',
      }
    });
    var stopicon_on = L.Icon.extend({
      options : {
        iconUrl      :     'public/imgs/stop.png',
        iconSize     :     [16, 18],
        iconAnchor   :     [8, 18],
        popupAnchor  :     [0, -15],
        className    :     'icon-on',
      }
    });

    if (properties) {
      $scope.targetFeature.properties   = properties;
      $scope.targetFeature.alternatives = [];

      $scope.routesLayer.eachLayer(function (layer) {
        layer.setStyle({
          opacity : 0.1,
          weight  : 3,
        });
        if (layer.options.base.route_id == properties.route_id) {
          layer.setStyle({
            opacity : 0.35,
            weight  : 5,
          });
        }
      });

      $scope.stopsLayer.eachLayer(function (marker) {
        if (marker.options.base.stop_id.includes(properties.route_id)) {
          marker.setIcon(new stopicon_on());
        } else {
          marker.setIcon(new stopicon_base());
        }
      });

      angular.forEach($scope.layers_left.geojson['proposed'][properties.corId], function(each) {
        if (each[0].base && each[1].base) {
          $scope.targetFeature.alternatives.push(each[0].base);
          $scope.targetFeature.alternatives.push(each[1].base);
        }
      }, $scope.layers_left.geojson['proposed'][properties.corId])
    } else {
      $scope.targetFeature.properties   = null;
      $scope.targetFeature.alternatives = null;

      $scope.routesLayer.eachLayer(function (layer) {
        layer.setStyle({
          opacity : 0.1,
          weight  : 3,
        });
      });

      $scope.stopsLayer.eachLayer(function (marker) {
        marker.setIcon(new stopicon_base());
      });
    }
  }


  $scope.newVariant = function (tabnav) {
    $scope.variants[tabnav].push($scope.scenario[tabnav]);
    $scope.saveAlt = false;
    $scope.scenario[tabnav] = angular.copy($scope.variationModel);
  }

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








