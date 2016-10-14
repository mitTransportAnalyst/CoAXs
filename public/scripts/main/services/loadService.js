// all of these have been explained in main controller, this is simple the services portion and each function 
// roughly shares the same name
// here, in the service, is the boilerplate involved in interfacing with leaflet's api and putting the actual marker or route on the map
coaxsApp.service('loadService', function ($q, $http, analystService, leafletData, targetService, supportService) {

  this.getCordons = function (cb) {
	 
	$http.get('/geojson/cordons')
    .success(function (data, status) { 
		cordonGeos = L.layerGroup();
		var cordonData = {}; //new Array(numCordons);
		for (cordonId in data){
			cordonGeos.addLayer(
				L.geoJson(data[cordonId],
				{style: {weight: 1.5,
						 opacity:0,
						 fillOpacity:0,
						 id: cordonId,
						 dashArray: 3,
						 color: data[cordonId].features[0].properties.color}}));
			cordonData[cordonId] = data[cordonId].features[0].properties;
		}
	  cb([cordonGeos,cordonData]);
	});
  }

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
  };

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
  };



  
  this.getProposedRoutes = function (cb,variants) {
    $http.get('/load/routes')
    .success(function (data, status) {
      var geojsonList   = [];
      var routes = {};

      for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i].properties;
        feature['length'] = supportService.getLength(data.features[i].geometry);

        if (!routes[feature.pid]) { routes[feature.pid] = {} };
        var color = variants[feature.corridorId].color;
        routes[feature.pid] = L.geoJson(data.features[i], {
          style: function (feature) {
            return {
              color: color,
              weight: 1,
              opacity: 0.5
            };
          },
          base: feature
        });

        geojsonList.push(routes[feature.pid]);
      }
      var routesLayer = L.layerGroup(geojsonList);
      cb({layerGroup:L.layerGroup(geojsonList), geoJsons:routes});

    });
  };

  this.getTrunk = function (cb,variants) {
    $http.get('/load/trunks')
      .success(function (data, status) {
        var geojsonList   = [];
        var routes = {};

        for (var i = 0; i < data.features.length; i++) {
          var feature = data.features[i].properties;
          feature['length'] = supportService.getLength(data.features[i].geometry);

          var color = variants[feature.corridorId].color;
          routes[i] = L.geoJson(data.features[i], {
            style: function (feature) {
              return {
                color: color,
                weight: 10,
                opacity: 0.4
              };
            },
            base: feature
          });

          geojsonList.push(routes[i]);
        }
        var routesLayer = L.layerGroup(geojsonList);
        cb({layerGroup:L.layerGroup(geojsonList), geoJsons:routes});

      });
  };


  this.getStops = function (url, cb) {
    $http.get(url)
    .success(function (data, status) {

      var stopList = [];

      for (var i=0; i<data.features.length; i++) {
        var stop = data.features[i];

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

  this.getDestinationData = function (file, cb) {
    $http.get('/load/destinations/'+file)
    .success(function (data, status) {
	  cb(data);
	})
  };
  
  this.getVariants = function (file, cb) {
    $http.get('/load/scenario/'+file)
    .success(function (data, status) {
	  cb(data);
	})
  }


  this.getUserData = function (file, cb) {
    $http.get('/load/users/'+file)
      .success(function (data, status) {
        var circles = [];
        var poiUsers = data;

        var iconStyle = L.Icon.extend({
          options : {
            iconSize     : [22, 22],
            iconAnchor   : [8, 18],
            popupAnchor  : [0, -15],
            className    : 'icon-on',
            userId       : 'null'
          }
        });
        
		var homeIcon = new iconStyle({iconUrl: 'public/imgs/userHome.png'});
		
		var workIcon = new iconStyle({iconUrl: 'public/imgs/userHeart.png'});  
		
        for (user in data) {
            var homeMarker = L.marker([data[user].homeLoc[0], data[user].homeLoc[1]], {icon: homeIcon});
			var workMarker = L.marker([data[user].workLoc[0], data[user].workLoc[1]], {icon: workIcon});
            homeMarker['userId'] = user;
			workMarker['userId'] = user;
            circles.push(homeMarker);
			circles.push(workMarker);
        }
        cb(poiUsers, L.layerGroup(circles));
    })
  }

});