coaxsApp.service('rightService', function (leafletData) {

  this.updateRightRoutes = function (combo, variants, routesLayer, geoJsonRight, cb) {
    leafletData.getMap('map_right').then(function(map) {
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
    leafletData.getMap('map_right').then(function(map) {
      map.removeLayer(geoJsonRight);
    })
  };

});



