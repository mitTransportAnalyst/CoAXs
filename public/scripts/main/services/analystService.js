coaxsApp.service('analystService', function ($q, supportService) {

  this.isochrones = null;

  var Analyst = window.Analyst;
  var analyst = new Analyst(window.L, {
    apiUrl         : 'http://mit-analyst.dev.conveyal.com/api',
    tileUrl        : 'http://mit-analyst.dev.conveyal.com/tile',
    shapefileId    : '0579b6bd8e14ec69e4f21e96527a684b_376500e5f8ac23d1664902fbe2ffc364',
    graphId        : '8a35783dd95ff1a52fc928e183e23340',
    showIso        : true,
  });

  var optionCurrent = {
    'scenario'      : {
      'id'            : 0,
      'description'   : 'Run from CoAXs SPA.',
      'modifications' : [{
        'type'      : 'remove-trip',
        'agencyId'  : 'd802657',
        'routeId'   : [],
        'tripId'    : null
      }]
    }
  }

  var isoLayer   = null;
  var vectorIsos = null;
  var currentIso = null;


  this.resetAll = function (map, keepRoutes) {
    if (isoLayer)   { isoLayer.setOpacity(1); };
    if (currentIso) { map.removeLayer(currentIso); };

    var allRoutes = ['029f53a', '007dd6d', 'a534420', '7cb27d8', '86d2825', 'b56b5fd', 'a3e69c4', 'ea50129', '6f451b2', 'b56b5fd', 'cda69a2', 'a1c4c2e', '87aeff8', 'd6bd98c'];
    
    if (keepRoutes) {
      for (var i=0; i<allRoutes.length; i++) { if (allRoutes[i] in keepRoutes) { allRoutes.splice(i,1); } }
      optionCurrent.scenario.modifications[0].routeId = allRoutes;
    } else {
      optionCurrent.scenario.modifications[0].routeId = allRoutes;
    }
    console.log(optionCurrent.scenario.modifications[0].routeId);
  }

  this.singlePointRequest = function (marker, map, compareKey) {
      // compareKey = 'fd440584-25fc-4bf7-bb38-c46c9d62223f';

    analyst.singlePointRequest({
      lat : marker.model.lat,
      lng : marker.model.lng,
    }, compareKey, optionCurrent)
    .then(function (response) { 
      console.log('response', response.results.key);
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
    }, optionCurrent)
    .then(function (response) {
      vectorIsos = response.isochrones;
      cb(true);
    });
  }

  this.showVectorIsos = function(timeVal, map) {
    if (isoLayer) { isoLayer.setOpacity(0) };
    if (currentIso) { 
      map.removeLayer(currentIso); 
    };

    var isosArray = vectorIsos.worstCase.features
    for (var i=0; i<isosArray.length; i++) { 
      if (isosArray[i].properties.time == timeVal) { 
        currentIso = L.geoJson(isosArray[i], {style:{
          stroke      : true,
          fillColor   : '#FDB813',
          color       : '#F68B1F',
          weight      : 1,
          fillOpacity : 0.25,
          opacity     : 1
        }});
        currentIso.addTo(map);
      }
    }
  }

});






