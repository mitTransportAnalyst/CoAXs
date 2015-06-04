coaxsApp.service('targetService', function (leafletData) {
  
  var stopicon_base = L.Icon.extend({
    options : {
      iconUrl      :     'public/imgs/stop.png',
      iconSize     :     [16, 18],
      iconAnchor   :     [8, 18],
      popupAnchor  :     [0, -15],
      className    :     'icon-off',
    }
  });
  var stopicon_on = L.Icon.extend({
    options : {
      iconUrl      :     'public/imgs/stop.png',
      iconSize     :     [16, 18],
      iconAnchor   :     [8, 18],
      popupAnchor  :     [0, -15],
      className    :     'icon-on',
    }
  });

	this.targetStops = function (stopsLayer, id) {
    stopsLayer.eachLayer(function (marker) {
      if (marker.options.base.stopId.includes(id)) {
        marker.setIcon(new stopicon_on());
      } else {
        marker.setIcon(new stopicon_base());
      }
    });
	  return stopsLayer
	}

	this.targetCorridor = function (routesLayer, id) {
	  leafletData.getMap('map_left').then(function(map) {
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

  this.newTargetFeature = function (routes, properties) {
  	var targetFeature = {
  		properties   : properties,
  		alternatives : [],
  	};

  	for (var key in routes) {
  		var route = routes[key];
  		if (route[0] && route[1]) {
        if (properties.corId == route[0].options.base.corId && properties.corId == route[1].options.base.corId) { 
          targetFeature.alternatives.push(route[0].options.base);
          targetFeature.alternatives.push(route[1].options.base);
        }
  		}
  	}

    return targetFeature;
  }

  this.clearTargetFeature = function () {

  }

});










