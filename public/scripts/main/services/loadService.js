// all of these have been explained in main controller, this is simple the services portion and each function 
// roughly shares the same name
// here, in the service, is the boilerplate involved in interfacing with leaflet's api and putting the actual marker or route on the map
coaxsApp.service('loadService', function ($q, $http, analystService, leafletData, targetService, supportService) {

  this.getExisting = function (cb, gs) {
	$http.get('/geojson/existing')	
    .success(function (data, status) {
		var subwayRoutes = L.geoJson(data, {
        style: function (feature, grayscale) {
		  var col = "#AAAAAA";
		  if (!gs){col = feature.properties.COLOR;}
		  return {
            color     : col,
            weight    : 1.5,
            opacity   : 0.5,
            dashArray : 0,
          };
        }
      });
      cb(subwayRoutes);
    });    
  }

  this.getProposedPriorityLanes = function (cb) {
    $http.get('/geojson/proposed_priority')
    .success(function (data, status) {
      var geojsonList = [];
      var routes = {};
      for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i].properties;
        if (!routes[feature.routeId]) { routes[feature.routeId] = {} };
        var color = '#' + feature.routeColor;
        routes[feature.routeId][feature.direction] = L.geoJson(data.features[i], {
          style: function (feature) { 
			return { color: color, 
				weight: 16, 
				opacity: 0
			}; 
		},
		  base: feature
        });
        geojsonList.push(routes[feature.routeId][feature.direction]);
      }
      var priorityLayer = L.layerGroup(geojsonList);
	  cb(priorityLayer);
    });
  }

  this.getProposedRoutes = function (cb) {
    $http.get('/geojson/proposed')
    .success(function (data, status) {

      var geojsonList   = [];
      var routes = {};

      for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i].properties;
        feature['length'] = supportService.getLength(data.features[i].geometry);

        if (!routes[feature.routeId]) { routes[feature.routeId] = {} };
        var color = '#' + feature.routeColor;
        routes[feature.routeId][feature.direction] = L.geoJson(data.features[i], {
          style: function (feature) {
            return {
              color: color,
              weight: 3,
              opacity: 0.1,
            };
          },
          onEachFeature: function (feature, layer) {
            // per anson's request that when you click on a route it brings up the routes data, this is a hacky solution
            layer.on({click: function (e) {
              var route = e.target.feature.properties;

              var appElement = document.querySelector('[ng-app=coaxsApp]');
              var appScope = angular.element(appElement).scope().$$childHead;

              appScope.targetCorridor(route.corName);
              appScope.tabnav = route.corName;
              appScope.overview = true;
            }});
          },
          base: feature
        });

        geojsonList.push(routes[feature.routeId][feature.direction]);
      }
      cb({layerGroup:L.layerGroup(geojsonList), geoJsons:routes});
    });    
  }

  this.getStops = function (url, cb) {
    $http.get(url)
    .success(function (data, status) {

      var stopList = [];

      for (var i=0; i<data.features.length; i++) {
        var stop = data.features[i];

        if (stop.properties.stopId) {
          var stopId = stop.properties.stopId;
          stop.properties['routeId'] = stopId.substr(stopId.indexOf('rte-')+4);
        }

        stopList.push(L.circle([stop.geometry.coordinates[1], stop.geometry.coordinates[0]], 0, {
          stroke: false,
          fillOpacity: 0.0,
          base: stop.properties
        }));
      };

      var stopsLayer = L.layerGroup(stopList);
      cb(stopsLayer);
    });
  };

  this.getLocationCache = function () {
    var deferred = $q.defer();
    $http.get('/cachedLocs')
      .success(function (data) {deferred.resolve(data)})
      .error(function(data, status, headers, config) {deferred.resolve(false)});
    return deferred.promise;
  }
  
  this.loadSnapCache = function (fileName) {
    var deferred = $q.defer();
    var url = '/startSnapCache/' + fileName;
    $http.get(url)
    .success(function (data) {
      if (data.started) {
        var runCheck = setTimeout(function () {
          $http.get('/loadSnapCache')
          .success(function (data) {
            if (data.notReady) {
              console.log('Running check...');
              runCheck();
            } else {
              console.log('POIs baseline loaded: ', data);
              deferred.resolve(data)
            }
          }).error(function (data) {
            console.log('Error on load of snap points. Error: ', data);
            deferred.resolve(false);
          })
        }, 2000);
      }
    }).error(function (data, status, headers, config) {
      console.log('Error on load of snap points. Error: ', data, status);
      deferred.resolve(false)
    });
    return deferred.promise;
  }
  

  this.updateLocationCache = function (data, id) {
    var deferred = $q.defer();
    var i = 0;
    var poiUpdateSequence = function () {
      if (!data[i].graphData || !data[i].isochrones) {
        leafletData.getMap('map_left').then(function(map) {
          analystService.resetAll(map);
          analystService.modifyRoutes([]);
          analystService.modifyDwells([]);
          analystService.modifyFrequencies([]);

          // welcome to callback hell
          analystService.singlePointRequest(data[i], map, undefined, function (key, subjects) {
            if (subjects) { 
              data[i]['graphData'] = subjects; 
              analystService.vectorRequest(data[i], false, function (result, isochrones) {
                if (result) {
                  data[i]['isochrones'] = isochrones;
                  i += 1;
                  if (i < data.length) { console.log('running round ', i); poiUpdateSequence(); }
                  else {
                    var newPOIs = JSON.stringify(data);
                    var url = '/cachedLocs/' + id;
                    $http.post(url, {newPOIs: newPOIs})
                    .success(function (data) {
                      deferred.resolve(true);
                    }).error(function(data, status, headers, config) {
                      deferred.resolve(false);
                    });
                  }
                };
              });
            }
          });
        });
      } else {
        i += 1;
        if (i < data.length) { poiUpdateSequence(); }
        else { deferred.resolve(JSON.stringify(data)); }
      }
    };
    poiUpdateSequence();
    return deferred.promise;
  }
  

  this.createNewLocationCache = function (data, id) {
    var deferred = $q.defer();
    var i = 0;
    var poiUpdateSequence = function () {
      leafletData.getMap('map_left').then(function(map) {
        analystService.resetAll(map);
        analystService.modifyRoutes([]);
        analystService.modifyDwells([]);
        analystService.modifyFrequencies([]);

        // welcome to callback hell
        analystService.singlePointRequest(data[i], map, undefined, function (key, subjects) {
          if (subjects) { 
            data[i]['graphData'] = subjects; 
            analystService.vectorRequest(data[i], false, function (result, isochrones) {
              if (result) {
                data[i]['isochrones'] = isochrones;
                i += 1;
                if (i < data.length) { poiUpdateSequence(); }
                else {
                  var newPOIs = JSON.stringify(data);
                  var url = '/cachedLocs/' + id;
                  $http.post(url, {newPOIs: newPOIs})
                  .success(function (data) {
                    deferred.resolve(true);
                  }).error(function(data, status, headers, config) {
                    deferred.resolve(false);
                  });
                }
              };
            });
          }
        });
      });
    };
    poiUpdateSequence();
    return deferred.promise;
  }

  // update map with phil's spread sheet points
  this.getUsersPoints = function (cb) {
    $http.get('/pois')
    .success(function (data, status) {
      if (status == 200) {       
        var circles = [];
        var poiUsers = [];

        var iconStyle = L.Icon.extend({
          options : {
            iconSize     : [22, 22],
            iconAnchor   : [8, 18],
            popupAnchor  : [0, -15],
            className    : 'icon-on',
            userId       : 'null'
          }
        });

        for (var i=0; i<data.length; i++) {
          var pois = JSON.parse(data[i].POIs);
          var userId = data[i].Name[0] + data[i].Name[1]; 
          var points = [];
		  var homeLoc = [];
  
          for (var n=0; n<pois.length; n++) {
            var icon;
            if (pois[n].poiTag == "HOME") {
              icon = new iconStyle({iconUrl: 'public/imgs/userHome.png'});
			  homeLoc = [pois[n].lat, pois[n].lng];
            }
            else if (pois[n].poiTag == "HEALTHCARE")  {
              icon = new iconStyle({iconUrl: 'public/imgs/userHeart.png'});  
            }
            else {
              icon = new iconStyle({iconUrl: 'public/imgs/userShop.png'});
            }
            var marker = L.marker([pois[n].lat, pois[n].lng], {icon: icon}, {name: data[i].Name});
            marker['userId'] = userId;
            circles.push(marker);
            points.push({lat: pois[n].lat, lng: pois[n].lng, poiTag: pois[n].poiTag});
          }
          poiUsers.push({userId : userId, points: points, homeLoc: homeLoc});
        }
        cb(L.layerGroup(circles), poiUsers);
      }
    })
  };



});








