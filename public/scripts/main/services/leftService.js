coaxsApp.service('leftService', function (leafletData) {

  this.updateLeftRoutes = function (combo, variants, routesLayer, geoJsonLeft, cb) {
    leafletData.getMap('map_left').then(function(map) {
      if (geoJsonLeft) { console.log('foo', geoJsonLeft); map.removeLayer(geoJsonLeft); }
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


  this.targetPOIUsers = function (poiUsers, id) {
    poiUsers.eachLayer( function (layer) { console.log(layer)
      if (layer.userId == id) { layer.setOpacity(1); } 
      else { layer.setOpacity(0); }
    });
  }

});



