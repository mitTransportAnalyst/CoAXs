// all of these have been explained in main controller, this is simple the services portion and each function 
// roughly shares the same name
// here, in the service, is the boilerplate involved in interfacing with leaflet's api and putting the actual marker or route on the map
coaxsApp.service('loadService', function ($http, analystService, targetService, supportService) {

  this.getExisting = function (cb) {
    $http.get('/geojson/existing')
    .success(function (data, status) {
      var subwayRoutes = L.geoJson(data, {
        style: function (feature) {
          return {
            color     : feature.properties.LINE,
            weight    : 2,
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
          style: function (feature) { return { color: color, weight: 10, opacity: 0.1 }; }
        });
        geojsonList.push(routes[feature.routeId][feature.direction]);
      }
      cb(L.layerGroup(geojsonList));
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

  this.updateLocationCache = function (cb) {
    $http.get('/geojson/cachedLocs')
    .success(function (data, status) {
      var i = 0;
      var poiUpdateSequence = function () {
        console.log("Running instance: ", i);
        if (!data[i].graphData || !data[i].tilesURL || !data[i].isochrones) {
          leafletData.getMap('map_left').then(function(map) {
            console.log("Running base case for: ", i);
            analystService.resetAll(map);
            analystService.modifyRoutes([]);
            analystService.modifyDwells([]);
            analystService.modifyFrequencies([]);

            // welcome to callback hell
            analystService.singlePointRequest(data[i], map, undefined, function (key, subjects, tilesURL) {
              console.log("Running SPA instance: ", i);
              if (subjects) { 
                data[i]['graphData'] = subjects; 
                data[i]['tilesURL'] = tilesURL; 
                analystService.vectorRequest(data[i], false, function (result, isochrones) {
                  if (result) {
                    data[i]['isochrones'] = isochrones.worstCase.features;
                    i += 1;
                    if (i < data.length) { poiUpdateSequence(); }
                    else {  
                      $http.post('/cachedLocs', {newPOIs: JSON.stringify(data)})
                      .success(function (data, status) {
                        cb(true);
                      }).error(function(data, status, headers, config) {
                        cb(false);
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
          else { console.log('already up to date'); cb(true); }
        }
      };
      poiUpdateSequence();
    }).error(function(data, status, headers, config) {
      console.log(data, status, headers, config);
    });
  }

  // update map with phil's spread sheet points
  this.getUsersPoints = function (cb) {
    $http.get('/pois')
    .success(function (data, status) {
      if (status == 200) {
       
        var circles = [];
        var poiUsers = [];
        var homeIcons = [];

        // var iconColor = ('00000'+(Math.random()*(1<<24)|0).toString(16)).slice(-6)

        var smallMarkerOptions = {
          radius      : 10,
          fillColor   : 'yellow',
          color       : 'null',
          weight      : 1,
          opacity     : 1,
          fillOpacity : 0.8
        };
        
        // Invisible Marker underlay for tooltip activation
        var bigMarkerOptions = {
          radius      : 15,
          fillColor   : 'rgba(139,139,210,0)',
          weight      : 0,
        };

        
        // POI Marker Class Setup
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

          // SAVE for Tooltip Activation 
          // smallMarkerOptions['userId'] = userId;
          // bigMarkerOptions['userId']   = userId;
                 
          poiUsers.push({ 
            name : userId, 
            color : ('00000'+(Math.random()*(1<<24)|0).toString(16)).slice(-6)
          });
  
          for (var n=0; n<pois.length; n++) {

            // SAVE for Tooltip Activation 
            // if (pois[n].poiTag == "home") {
            // circles.push(L.marker([pois[n].lat, pois[n].lng], {icon: homeIcon}, {name: data[i].Name}));
            // } else {
            // circles.push(L.circleMarker([pois[n].lat, pois[n].lng], smallMarkerOptions, {name: data[i].Name}));
            // }
            // circles.push(L.circleMarker([pois[n].lat, pois[n].lng], bigMarkerOptions)   // field for for tooltip hoover
            //   .bindPopup('<b>' + data[i].Name + '</b>: ' + pois[n].poiTag));

            if (pois[n].poiTag == "home") {
              var icon = new iconStyle({iconUrl: 'public/imgs/userHome.png'});
            }
            else if (pois[n].poiTag == "friends" || pois[n].poiTag == "family")  {
              var icon = new iconStyle({iconUrl: 'public/imgs/userHeart.png'});  
            }
            else {
              var icon = new iconStyle({iconUrl: 'public/imgs/userShop.png'});
              
            }
            var marker = L.marker([pois[n].lat, pois[n].lng], {icon: icon}, {name: data[i].Name});
            marker['userId'] = userId;
            circles.push(marker);
          
          }
        }
        var iconLayers = L.layerGroup(circles);
        cb(iconLayers, poiUsers);        
      }
    })
  };



});








