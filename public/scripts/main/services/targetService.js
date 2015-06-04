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

  this.newTargetFeature = function (routesLayer, properties) {
  	var targetFeature = {
  		properties   : properties,
  		alternatives : [],
  	};

    // stopsLayer.eachLayer(function (marker) {
    //   if (marker.options.base.stop_id.includes(properties.routeId)) {
    //     marker.setIcon(new stopicon_on());
    //   } else {
    //     marker.setIcon(new stopicon_base());
    //   }
    // });

    // angular.forEach(layers_left.geojson['proposed'], function(each) {
    //   if (each[0] && each[1]) {
    //     if (properties.corId == each[0].options.base.corId && properties.corId == each[1].options.base.corId) {
    //       targetFeature.alternatives.push(each[0].options.base);
    //       targetFeature.alternatives.push(each[1].options.base);
    //     }
    //   }
    // }, layers_left.geojson['proposed'])
  }

  this.clearTargetFeature = function () {

  }

});










