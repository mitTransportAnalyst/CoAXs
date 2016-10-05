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

    this.targetCordons = function(cordonLayer, id){
		cordonLayer.eachLayer(function(boundary){
			if (boundary.options.style.id == id) {
				boundary.setStyle({opacity:0.75})}
			else{boundary.setStyle({opacity:0})}
		})
	};
	
  // highlight the stops of a specific route
	this.targetStops = function (stopsLayer, id, stationType, routeColor) {
    var stopTypeSizes = {0: 60, 1: 90, 2: 120};

    stopsLayer.eachLayer(function (circle) {
      if (circle.options.base.routeId == id) {

        var stationLatLng = [circle._latlng.lat, circle._latlng.lng],
            stationStop = stopTypeSizes[stationType]; 

        circle.setStyle({
          stroke: true,
          weight: 2,
          color: '#FFF',
          opacity: 1.0,
          fillColor: '#' + routeColor,
          fillOpacity: 0.8,
        });
        circle.setRadius(stationStop);
      } else {
        circle.setStyle({stroke: false, fillOpacity: 0.0});
        circle.setRadius(0);
      }
    });
	  return stopsLayer;
	}
	
	this.targetPriority = function(priorityLayer, id) {
		priorityLayer.eachLayer(function (segment){
			if (segment.options.base.corridorId == id) {segment.setStyle({opacity: 0.1})}
			else {segment.setStyle({opacity: 0});
	      }
		})
		return priorityLayer;
	}
	

  // highlight a corridor or route that matches an id (id will dictate which gets highlighted)
  // pans to the bounds of that site, as well
	this.targetCorridor = function (routesLayer, trunkLayer,id) {
	  leafletData.getMap('map_right').then(function(map) {
	    var tempBounds = null;
	    routesLayer.eachLayer(function (layer) {
	      if (layer.options.base.corridorId == id) {
	        layer.setStyle({opacity: 0.8, weight: 2, color:"#555555"});
	        tempBounds = layer.getBounds();
	      } else {
	        layer.setStyle({opacity: 0.1, weight: 0.5, color:"#555555"});
	      }
	    });
      trunkLayer.eachLayer(function (layer) {
        if (layer.options.base.corridorId == id) {
          layer.setStyle({opacity: 0.8, weight: 10});
          tempBounds = layer.getBounds();
        } else {
          layer.setStyle({opacity: 0.1, weight: 0.5});
        }
      });

	    map.fitBounds(tempBounds);
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










