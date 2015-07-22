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

   
  // OLD VERSION (PRE-DAY IN THE LIFE)
  // this.targetPOIUsers = function (poiUsers, id) {
  //   poiUsers.eachLayer( function (layer) {
  //     if (layer.options.userId == id) {
  //       layer.setStyle({opacity : 1, fillOpacity : 1});
  //     } else {
  //       layer.setStyle({opacity : 0, fillOpacity : 0});
      
  //     }
  //   });
  // }

  // UPDATED VERSION FOR ACCOMODATING MULTIPLE ICON TYPES
    this.targetPOIUsers = function (poiUserPoints, id) {
      console.log("leftService receives clicked id" +" "+ id);
      //console.log(JSON.stringify(poiUsers));
      console.log("userPoints", poiUserPoints);
      poiUserPoints.eachLayer( function (marker) {
        console.log("marker", marker);

      if (marker.userId == id) {
          var icon = marker.options.icon.options.iconUrl;
         //console.log("icon URL at leftService" + " " +icon);
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
      } else {
          var icon = marker.options.icon.options.iconUrl;
          var icon_off = L.Icon.extend({
          options : {
            iconUrl      : icon,
            iconSize     : [25, 25],
            iconAnchor   : [8, 18],
            popupAnchor  : [0, -15],
            opacity      : .3,
            className    : 'icon-off',
          }
          });   
        marker.setIcon(new icon_off());    
        }
      });
    }
});



