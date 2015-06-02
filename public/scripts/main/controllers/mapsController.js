coaxsApp.controller('mapsController', function ($scope, $http, $state, leafletData, analystService) {

  // ui variables
  $scope.base = {
    'view_stations' : false,
    'view_freq'     : false,
    'view_overview' : false,
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

      $scope.layers_left.geojson['proposed'] = {}
      var geojsonList = [];

      for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i].properties;

        if (!$scope.layers_left.geojson['proposed'][feature.route_id]) { 
          $scope.layers_left.geojson['proposed'][feature.route_id] = {};
        }

        $scope.layers_left.geojson['proposed'][feature.route_id][feature.direction] = L.geoJson(data.features[i], {
          style: function (feature) {
            return {
              color     : '#' + feature.properties.routes_route_color,
              weight    : 3,
              opacity   : 0.1,
              dashArray : 0,
            };
          },
          onEachFeature: function (feature, layer) {
            // (function(layer, properties) {
            //   layer.on("mouseover", function (e) {
            //     $scope.updateTargetFeature(feature.properties);
            //   });
            // })
            // (layer, feature.properties);
          },
          base: feature,
        })
        geojsonList.push($scope.layers_left.geojson['proposed'][feature.route_id][feature.direction]);
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

  $scope.targetCorridor = function (attribute, corName) { console.log(corName)
    var tempBounds = []
    $scope.routesLayer.eachLayer(function (layer) {
      layer.setStyle({
        opacity : 0.1,
        weight  : 3,
      });
      if (layer.options.base[attribute] == corName) {
        layer.setStyle({
          opacity : 0.35,
          weight  : 5,
        });
        tempBounds.push(layer.getBounds())
      }
    });
    leafletData.getMap('map_left').then(function(map) {
      map.panInsideBounds(tempBounds[0]);
    })
  }

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

      $scope.targetCorridor('route_id', properties.route_id);

      $scope.stopsLayer.eachLayer(function (marker) {
        if (marker.options.base.stop_id.includes(properties.route_id)) {
          marker.setIcon(new stopicon_on());
        } else {
          marker.setIcon(new stopicon_base());
        }
      });

      angular.forEach($scope.layers_left.geojson['proposed'], function(each) {
        if (each[0] && each[1]) {
          if (properties.corId == each[0].options.base.corId && properties.corId == each[1].options.base.corId) {
            $scope.targetFeature.alternatives.push(each[0].options.base);
            $scope.targetFeature.alternatives.push(each[1].options.base);
          }
        }
      }, $scope.layers_left.geojson['proposed'])

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

  $scope.test = function (other) {
    console.log('foo', other);
    console.log($scope.scenario);
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
