coaxsApp.service('analystService', function ($q, supportService) {

  this.isochrones = null;

  var Analyst = window.Analyst;
  var analyst = new Analyst(window.L, {
    apiUrl      : 'http://mit-analyst.dev.conveyal.com/api',
    tileUrl     : 'http://mit-analyst.dev.conveyal.com/tile',
    shapefileId : '0579b6bd8e14ec69e4f21e96527a684b_376500e5f8ac23d1664902fbe2ffc364',
    graphId     : '0ebb30ab8664001407b0ad524b102bd4',
    showIso     : true
  });
  var isoLayer   = null;
  var vectorIsos = null;
  var currentIso = null;

  this.resetAll = function (map) {
    if (isoLayer)   { isoLayer.setOpacity(1); };
    if (currentIso) { map.removeLayer(currentIso); };
  }

  this.singlePointRequest = function (marker, map) {
    analyst.singlePointRequest({
      lat : marker.model.lat,
      lng : marker.model.lng,
    })
    .then(function (response) {
      if (isoLayer) {
        isoLayer.redraw();
      } else {
        isoLayer = response.tileLayer;
        isoLayer.addTo(map);
      }
    })
    .catch(function (err) {
      console.log(err);
    });
  }


  this.vectorRequest = function (marker, cb) {
    analyst.vectorRequest({
      lat : marker.model.lat,
      lng : marker.model.lng,
    })
    .then(function (response) {
      vectorIsos = response.isochrones;
      cb(true);
    });
  }

  this.showVectorIsos = function(timeVal, map) {
    if (isoLayer) { isoLayer.setOpacity(0); };
    if (currentIso) { map.removeLayer(currentIso); };

    var isosArray = vectorIsos.worstCase.features
    for (var i=0; i<isosArray.length; i++) {
      if (isosArray[i].properties.time == timeVal) {

        currentIso = L.geoJson(isosArray[i], {style:{
          stroke      : true,
          fillColor   : '#b2b2ff',
          color       : '#4c4cff',
          weight      : 1,
          fillOpacity : 0.5,
          opacity     : 1
        }});
        currentIso.addTo(map);
        return isosArray[i];
      }
    }
  }

});






