coaxsApp.controller('mapsController', function ($scope, $state, leafletData, analystService, loadService, targetService) {

  // UI management variables
  $scope.base = {
    'view_stations' : false,
    'view_freq'     : false,
    'view_overview' : false,
  }
  $scope.targetFeature = {
    'properties'    : {},
    'alternatives'  : {},
  }
  $scope.tabnav = 'BH'; // set default view on start


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


  // initialize imported data
  leafletData.getMap('map_left').then(function(map) {
    loadService.getExisting(function(subways) {
      subways.addTo(map);
    });

    loadService.getProposedRoutes(function(routesLayer) {
      $scope.routesLayer = routesLayer;
      $scope.routesLayer.addTo(map);
    });

    $scope.stopsLayer = loadService.getProposedStops(function(stopsLayer) {
      $scope.stopsLayer = stopsLayer;
      $scope.stopsLayer.addTo(map);
    });
  });



  $scope.$on('leafletDirectiveMarker.dragend', function (e, marker) {
    leafletData.getMap('map_right').then(function(map) {
      analystService.dragendAction(marker, map);
    });
  });




  $scope.targetCorridor = function (attribute, corName) {
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
      map.setZoom(12);
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

      $scope.targetCorridor('routeId', properties.routeId);

      $scope.stopsLayer.eachLayer(function (marker) {
        if (marker.options.base.stop_id.includes(properties.routeId)) {
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
