coaxsApp.service('loadService', function ($http) {

  this.getExisting = function (cb) {
    $http.get('/geojson/existing')
    .success(function(data, status) {
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
    .success(function(data, status) {

      var geojsonList   = [];
      var proposedLayer = {};

      for (var i = 0; i < data.features.length; i++) {
        var feature = data.features[i].properties;
        if (!proposedLayer[feature.routeId]) { proposedLayer[feature.routeId] = {} };
        var color = '#' + feature.routeColor;
        proposedLayer[feature.routeId][feature.direction] = L.geoJson(data.features[i], {
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

        geojsonList.push(proposedLayer[feature.routeId][feature.direction]);
      }

      var routesLayer = L.layerGroup(geojsonList);
      cb(routesLayer);
    });    
  }

  this.getProposedStops = function (cb) {
    $http.get('/geojson/proposed_stops')
    .success(function(data, status) {

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
        stopList.push(L.marker([stop.properties.stop_lat, stop.properties.stop_lon], {
          'icon'        : new stopicon(),
          'riseOnHover' : true,
          'base'        : stop.properties,
        }))
      }

      var stopsLayer = L.layerGroup(stopList);
      cb(stopsLayer);
    });
  }

});



