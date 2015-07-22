coaxsApp.controller('mapsController', function ($scope, $state, leafletData, analystService, d3Service, loadService, targetService, scorecardService, leftService, supportService) {

  // Control Panel Dynamic Sizing
  
  
  var tableWidth = ((window.innerWidth/2) - 40)*0.6 + 'px';
  $scope.tableWidth = tableWidth;

  var editorWidth = ((window.innerWidth/2) - 40)*0.4 + 'px';
  $scope.editorWidth = editorWidth;

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
  var existingMBTAKey = null;
  $scope.loadProgress = {vis:false, val:0};
  $scope.vectorIsos   = {vis:false, val:12};

  // right globals
  var geoJsonRight = null;


  // Angular Leaflet Directive - base components
  var defaults_global = {
    minZoom: 9,
    maxZoom: 15,
    scrollWheelZoom    : true,
    zoomControl        : false,
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
  $scope.maxBounds_right  = angular.copy(maxBounds_global);
  $scope.center_right    = angular.copy(center_global);
  $scope.tiles_right     = angular.copy(tiles_global);
  // Assembling right map
  $scope.defaults_left = angular.copy(defaults_global);
  $scope.maxBounds_left  = angular.copy(maxBounds_global);
  $scope.center_left   = angular.copy(center_global);
  $scope.center_left.zoom = 11;
  $scope.tiles_left    = angular.copy(tiles_global);
  $scope.geojson_left  = null;
  $scope.markers_left  = { main: { lat: $scope.center_left.lat, lng: $scope.center_left.lng, draggable : true }};

  // Left map listener
  $scope.$on('leafletDirectiveMarker.dragend', function (e, marker) {
    leftLeafletMarker = marker;
    $scope.markers_left.main = {
      lat  : marker.model.lat,
      lng  : marker.model.lng,
      draggable : true
    }
    runMarkerQuerys();
  });


  // what calls the SPA analysis and updates and tile and map components
  runMarkerQuerys = function () {
    var marker = $scope.markers_left.main

    animateProgressBar(); // start the progress bar
    leafletData.getMap('map_left').then(function(map) {

      // logic for handling when scenario compare is turned on and there is a selected scenario to compare against
      if ($scope.combos.com && $scope.scenarioCompare) {
        analystService.modifyRoutes(getKeepRoutes($scope.combos.com));
        analystService.singlePointRequest($scope.markers_left.main, map, undefined, function (compareKey) {
          analystService.modifyRoutes(getKeepRoutes($scope.combos.sel));
          analystService.resetAll(map);
          analystService.singlePointRequest(marker, map, compareKey, function (key) {
            $scope.loadProgress.val = 100;
            setTimeout(function () { $scope.$apply (function () {
              $scope.loadProgress.vis = false; // terminate progress bar viewport
            }) }, 1000)
          });
        });
      // logic if there is no scenario to compare against (if compare is on then compares against baseline, else just runs standard SPA)
      } else {
        analystService.modifyRoutes(getKeepRoutes($scope.combos.sel));
        analystService.resetAll(map);
        var compareKey = !$scope.combos.com && $scope.scenarioCompare ? existingMBTAKey : undefined;
        analystService.singlePointRequest(marker, map, compareKey, function (key, subjects) {
          d3Service.drawGraph(subjects.jobs_tot); // draws svg of jobs access, etc.
          if (!$scope.combos.sel) { existingMBTAKey = key }
          analystService.vectorRequest(marker, function (result) {
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

  // filter for routes that match with the desired corridor
  getKeepRoutes = function (selected) {
    var keepRoutes = [];
    if ($scope.combos.all[selected]) {
      var selectedCorridors = $scope.combos.all[selected].sel;
      for (corridor in selectedCorridors) {
        var corridorData = $scope.variants[corridor].all[selectedCorridors[corridor]];
        if (corridorData) { keepRoutes.push(corridorData.routeId); }
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
          $scope.loadProgress.val += Math.floor(Math.random()*3);
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
  leafletData.getMap('map_right').then(function (map) {
    // get mbta existing subway information
    loadService.getExisting(function (subways) {
      subways.addTo(map);
      subwaysLayer = subways;
    });

    // get priority portions (do this first so it renders beneath other content)
    loadService.getProposedPriorityLanes(function (priorityLanes) {
      priorityLanes.addTo(map);
    })

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
        $scope.scenario[tabnavAlt].name = routes[key][0].options.base.varName;
        $scope.scenario[tabnavAlt].routeId = routes[key][0].options.base.routeId;
        $scope.scenario[tabnavAlt].station = routes[key][0].options.base.defaultStationType;
        var uuid = $scope.newVariant(tabnavAlt, false);
        if (routes[key][0].options.base.default || routes[key][1].options.base.default) {
          $scope.setSelectedVariant(tabnavAlt, uuid);
        }
      }
    });

    // place stops over routes plots on map
    loadService.getProposedStops(function (stops) {
      stops.addTo(map);
      stopsLayer = stops;
    });

    // kick start the first SPA request
    setTimeout(runMarkerQuerys, 2000);
  });

  // initialize imported data - MAP RIGHT (this all runs on load, call backs are used for asynchronous operations)
  leafletData.getMap('map_left').then(function (map) {
    loadService.getExisting(function (subways) {
      subways.addTo(map);
      subwaysLayer = subways;
    });

    // load user points from phil's google spreadsheet
    loadService.getUsersPoints(function (points, poiUsers) {
      $scope.poiUsers = poiUsers;
      poiUserPoints   = points;
      poiUserPoints.addTo(map);

    })
  })


  // highlight a corridor, all routes within
  $scope.targetCorridor = function (id) {
    targetService.targetCorridor(routesLayer, id);
    // targetService.targetStops(stopsLayer, null, 0);
  }

  // update a specific route within a corridor
  $scope.updateTargetFeature = function (variant) {
    var routeId = variant ? variant.routeId : undefined
    var station = variant ? variant.station : 0;
    targetService.targetCorridor(routesLayer, routeId);
    targetService.targetStops(stopsLayer, routeId, station);
    if (routeId) {
      $scope.targetFeature = targetService.newTargetFeature(routeId, routesLayer);
    } else {
      $scope.targetFeature = {};
    }
  }

  // create a new route variant based off of existing scenario settings
  $scope.newVariant = function (tabnav, autoSet) {
    var uuid = supportService.generateUUID();
    $scope.scenario[tabnav]['created'] = Date.now();
    $scope.variants[tabnav].all[uuid] = angular.copy($scope.scenario[tabnav]);
    $scope.scenario[tabnav] = angular.copy(scenarioBase);
    if (autoSet) { $scope.setSelectedVariant(tabnav, uuid); };
    return uuid;
  }

  // take a selected variant and set that to current (able to be loaded as total scenario)
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

  // set left default scenario to examine (for SPA or compare)
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

  // create a new total scenario to send over to the left map
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
    runMarkerQuerys();
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
      $scope.scenarioScore = scorecardService.generateEmptyScore();
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
      $scope.scenarioScore = { bus: busTot, length: lenTot, vehicles: vehTot };
    }
  }

  // this is to control against having offpeak val lower than peak val
  $scope.updateOffPeakVal = function (peakMin, tabnav) {
    if (Number(peakMin) > Number($scope.scenario[tabnav].offpeak.min)) {
      $scope.scenario[tabnav].offpeak.min = peakMin;
    };
  }

  // this is to iterate through and highlight only certain user's points (if null then all shown)
  // Updated to assign icons based on different POI categories
  $scope.targetPOIUsers = function (id) { 
    //console.log("controller detects clicked on of:" +" "+ id);
    if (id) { leftService.targetPOIUsers(poiUserPoints, id); console.log("controller detects clicked on of:" +" "+ id); }
    else { 
      poiUserPoints.eachLayer( function (marker) { 
        console.log("marker in controller", marker);
        var icon = marker.options.icon.options.iconUrl;
        //console.log("icon URL at controller"+" "+icon);
          var icon_on = L.Icon.extend({
            options : {
              iconUrl      : icon,
              iconSize     : [25, 25],
              iconAnchor   : [8, 18],
              popupAnchor  : [0, -15],
              opacity      : 1,
              className    : 'icon-on'
            }
          });
        marker.setIcon(new icon_on());
      });  
    }
    $scope.currentPOIUser = id;
  };
// Original Version Below Replaced with the version above with different POI icon assignment 
//   $scope.targetPOIUsers = function (id) {
//     if (id) { leftService.targetPOIUsers(poiUserPoints, id); }
//     else { poiUserPoints.eachLayer( function (layer) { layer.setStyle({opacity : 1, fillOpacity : 1}); }) }



  // holdover from before we had the range slider, still keeping around just inc ase we need again
  $scope.vectorTimeVal_add      = function () { if ($scope.showVectorIsosOn) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) + 1 }}
  $scope.vectorTimeVal_subtract = function () { if ($scope.showVectorIsosOn) { $scope.vectorIsos.val = Number($scope.vectorIsos.val) - 1 }}

  // switch between views of vector isos and map tiles if travel access
  $scope.toggleShowVectorIsos = function () {
    $scope.showVectorIsosOn = !$scope.showVectorIsosOn;
    leafletData.getMap('map_left').then(function (map) {
      if ($scope.showVectorIsosOn)  { analystService.showVectorIsos(300*$scope.vectorIsos.val, map); };
      if (!$scope.showVectorIsosOn) { analystService.resetAll(map); };
    });
  };


  // just boiler for now, ignore this - i use it to debug, currently we are using it for the manager auto create scenario tool bound to hamburger menu
  $scope.test = function(foo) {
    window.confirm('OK to run auto create scenarios?');

    var comboId = supportService.generateUUID();
    $scope.combos.all[comboId] = {
      name    : 'Baseline',
      created : Date.now(),
      sel     : {
        'BH' : null,
        'HP' : null,
        'HD' : null,
        'CT' : null,
      }
    };
    var comboId = supportService.generateUUID();
    $scope.combos.all[comboId] = {
      name    : 'BH & HP Local',
      created : Date.now(),
      sel     : {
        'BH' : $scope.variants['BH'].sel,
        'HP' : $scope.variants['HP'].sel,
        'HD' : $scope.variants['HD'].sel,
        'CT' : $scope.variants['CT'].sel,
      }
    };
  }

});
