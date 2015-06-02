coaxsApp.service('analystService', function() {
    var Analyst = window.Analyst;
    var analyst = new Analyst(window.L, {
      apiUrl      : 'http://mit-analyst.dev.conveyal.com/api',
      tileUrl     : 'http://mit-analyst.dev.conveyal.com/tile',
      shapefileId : '0579b6bd8e14ec69e4f21e96527a684b_376500e5f8ac23d1664902fbe2ffc364',
      graphId     : '94de64a1a8762769b7d50d0bda3d5763',
      showIso     : true
    });
    var isoLayer = null

    this.dragendAction = function (marker, map) {
      analyst
      .singlePointRequest({
        'lat' : marker.model.lat,
        'lng' : marker.model.lng
      }, 
      { 'scenario' : globalScenario })
      .then(function (response) {
        if (isoLayer) {
          isoLayer.redraw();
        } else {
          isoLayer = response.tileLayer;
          isoLayer
          .addTo(map)
          .bringToFront()
        }
      })
      .catch(function (err) {
        console.log(err)
      })
    }
});



globalScenario = null;

globalScenario = {
          'id'            : 0,
          'description'   : 'No description',
          'modifications' : [{
            'type'        : 'remove-trip',
            'agencyId'    : '41880d0',
            'routeId'     : ['93c4f45', '80d18a0', '552cc30', 'e003fda', '1f80529', 'ee48237', 'b41473f', '8d71159', 'e023f68', '575aa59', '101d7e7'],
            'tripId'      : [],
          }] 
        }



