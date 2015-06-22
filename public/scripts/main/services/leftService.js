coaxsApp.service('leftService', function (leafletData) {

  this.updateLeftRoutes = function (combo, variants, routesLayer, geoJsonRight, cb) {
    leafletData.getMap('map_left').then(function(map) {
      if (geoJsonRight) { map.removeLayer(geoJsonRight); }
      var geoJson = L.geoJson();
      routesLayer.eachLayer(function (layer) {
        var currenCor   = layer.options.base.corName;
        var variantName = combo.sel[currenCor];
        var variant     = variantName ? variants[currenCor].all[variantName] : null;

        if (variant && variant.routeId == layer.options.base.routeId) {
          geoJson.addData({
            'type'           : 'Feature',
            'properties'     : layer.options.base,
            'geometry'       : layer.toGeoJSON().features[0].geometry,
          });
        }
      });

      geoJson.eachLayer(function(layer) {
        layer.setStyle({
          color  : '#' + layer.feature.properties.routeColor,
          weight : 1,
        });
      })

      geoJson.addTo(map);
      cb(geoJson);
    })
  };

  this.clearRightRoutes = function (geoJsonRight) {
    leafletData.getMap('map_left').then(function(map) {
      map.removeLayer(geoJsonRight);
    })
  };

  this.targetPOIUsers = function (poiUsers, id) {
    poiUsers.eachLayer( function (layer) {
      if (layer.options.userId == id) {
        layer.setStyle({opacity : 1, fillOpacity : 1});
      } else {
        layer.setStyle({opacity : 0, fillOpacity : 0});
      }
    });
  }

});



