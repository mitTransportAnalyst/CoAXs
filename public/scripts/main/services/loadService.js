coaxsApp.service('loadService', function ($http, supportService) {

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
          layer.bindPopup('<b>' + feature.properties.LINE + ' Line</b> ' + feature.properties.ROUTE);
        }
      });
      cb(subwayRoutes);
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
              dashArray : 0,
            };
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

$http.get('/geojson/pois')
.success(function (data, status) {
  console.log(data);
  console.log(status);
})



});











