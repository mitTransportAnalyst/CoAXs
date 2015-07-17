coaxsApp.service('targetService', function (leafletData) {
  
  var stopicon_off = L.Icon.extend({
    options : {
      iconUrl      :     'public/imgs/stop.png',
      iconSize     :     [16, 18],
      iconAnchor   :     [8, 18],
      popupAnchor  :     [0, -15],
      className    :     'icon-off',
    }
  });

  // highlight the stops of a specific route
	this.targetStops = function (stopsLayer, id, stationType) {
    stopsLayer.eachLayer(function (marker) {
      if (marker.options.base.stopId.includes(id)) {
        var station = 'public/imgs/stop' + stationType + '.png';
        var stopicon_on = L.Icon.extend({
          options : {
            iconUrl      :     station,
            iconSize     :     [16, 18],
            iconAnchor   :     [8, 18],
            popupAnchor  :     [0, -15],
            className    :     'icon-on',
          }
        });
        marker.setIcon(new stopicon_on());
      } else {
        marker.setIcon(new stopicon_off());
      }
    });
	  return stopsLayer
	}

  // highlight a corridor or route that matches an id (id will dictate which gets highlighted)
  // pans to the bounds of that site, as well
	this.targetCorridor = function (routesLayer, id) {
	  leafletData.getMap('map_right').then(function(map) {
	    var tempBounds = null;
	    routesLayer.eachLayer(function (layer) {
	      if (layer.options.base.corName == id || layer.options.base.routeId == id) {
	        layer.setStyle({opacity: 0.35, weight: 5});
	        tempBounds = layer.getBounds();
	      } else {
	        layer.setStyle({opacity: 0.1, weight: 3});
	      }
	    });
	    map.setZoom(12).panInsideBounds(tempBounds);
	  });
	  return routesLayer
	}

  // updates the target feature data and provides an object with its alternative as well
  this.newTargetFeature = function (routeId, routesLayer) {
    var properties = null;
    var alternatives = [];
    routesLayer.eachLayer(function (layer) {
      if (layer.options.base.routeId == routeId) {
        properties = layer.options.base;
      }
    })
    if (properties) {
	    routesLayer.eachLayer(function (layer) {
	      if (layer.options.base.corId == properties.corId) {
	        alternatives.push(layer.options.base);
	      }
	    })
    }
    return { properties: properties, alternatives: alternatives };
  }


});










