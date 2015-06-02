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
            'agencyId'    : '1',
            'routeId'     : ['34E', '350', '4050', '230', '351', '2427', '110', '352', '111', '112', '354', '114', '236', '116', '117', '238', '119', '10', '11', '14', '15', '16', '17', '18', '19', '116117'],
            'tripId'      : null,
          }] 
        }



