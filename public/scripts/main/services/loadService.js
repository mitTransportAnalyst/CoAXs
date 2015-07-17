// all of these have been explained in main controller, this is simple the services portion and each function 
// roughly shares the same name
// here, in the service, is the boilerplate involved in interfacing with leaflet's api and putting the actual marker or route on the map
coaxsApp.service('loadService', function ($http, targetService, supportService) {

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
        },
        onEachFeature: function (feature, layer) {
          // layer.bindPopup('<b>' + feature.properties.LINE + ' Line</b> ' + feature.properties.ROUTE);
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
              color     : color,
              weight    : 3,
              opacity   : 0.1,
            };
          },
          onEachFeature: function (feature, layer) {
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

  this.getProposedStops = function (cb) {
    $http.get('/geojson/proposed_stops')
    .success(function (data, status) {

      var stopList = [];
      var stopicon = L.Icon.extend({
        options : {
          iconUrl      : 'public/imgs/stop.png',
          iconSize     : [16, 18],
          iconAnchor   : [8, 18],
          popupAnchor  : [0, -15],
          className    : 'icon-off',
        }
      });

      for (var i=0; i<data.features.length; i++) {
        var stop = data.features[i];
        stopList.push(L.marker([stop.geometry.coordinates[1], stop.geometry.coordinates[0]], {
          'icon'        : new stopicon(),
          'riseOnHover' : true,
          'base'        : stop.properties,
        }))
      }

      var stopsLayer = L.layerGroup(stopList);
      cb(stopsLayer);
    });
  }

  // update map with phil's spread sheet points
  this.getUsersPoints = function (cb) {
    $http.get('/geojson/pois')
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
            iconSize     : [25, 25],
            iconAnchor   : [8, 18],
            popupAnchor  : [0, -15],
            opacity: 1,
            className    : 'icon-on',
            userId       : 'null'
          }
        });

        for (var i=0; i<data.length; i++) {
          var pois = JSON.parse(data[i].POIs);
          var userId = data[i].Name[0] + data[i].Name[1];

          // smallMarkerOptions['userId'] = userId;
          // bigMarkerOptions['userId']   = userId;
          //homeIcon['userId']         = userId;

          //console.log("user id from loadService" + " " + homeIcon.options.userId);   
          //console.log(bigMarkerOptions);    
                 
          poiUsers.push({ 
            name : userId, 
            color : ('00000'+(Math.random()*(1<<24)|0).toString(16)).slice(-6)
          });
  
          for (var n=0; n<pois.length; n++) {
            // MIXED Markers + Circles approach 
            // if (pois[n].poiTag == "home") {
            // circles.push(L.marker([pois[n].lat, pois[n].lng], {icon: homeIcon}, {name: data[i].Name}));
            // } else {
            // circles.push(L.circleMarker([pois[n].lat, pois[n].lng], smallMarkerOptions, {name: data[i].Name}));
            // }
            // circles.push(L.circleMarker([pois[n].lat, pois[n].lng], bigMarkerOptions)   // field for for tooltip hoover
            //   .bindPopup('<b>' + data[i].Name + '</b>: ' + pois[n].poiTag));

            if (pois[n].poiTag == "home") {
              var icon = new iconStyle({iconUrl: 'public/imgs/home_icon.svg'});
            }
            else if (pois[n].poiTag == "friends" || pois[n].poiTag == "family")  {
              var icon = new iconStyle({iconUrl: 'public/imgs/heart.svg'});  
            }
            else {
              var icon = new iconStyle({iconUrl: 'public/imgs/shopping_cart.svg'});
              
            }
            var marker = L.marker([pois[n].lat, pois[n].lng], {icon: icon}, {name: data[i].Name});
            marker['userId'] = userId;
            circles.push(marker);
          
          }
        }
        //console.log(poiUsers);
        //console.log(bigMarkerOptions);
        //console.log(JSON.stringify(circles));
        var iconLayers = L.layerGroup(circles);
        //console.log(JSON.stringify(allLayers));
        //console.log(iconLayers);
        cb(iconLayers, poiUsers);        
      }
    })
  }



});



// [{"lat":42.34154398944031,"lng":-71.06918334960938,"poiTag":"family","timeTag":"mid-day","modeTag":"bicycle"},{"lat":42.33722984357811,"lng":-71.048583984375,"poiTag":"work","timeTag":"morning or afternoon","modeTag":"car"}]





