coaxsApp.service('analystService', function () {

    var Analyst = window.Analyst;
    var analyst = new Analyst(window.L, {
      apiUrl      : 'http://mit-analyst.dev.conveyal.com/api',
      tileUrl     : 'http://mit-analyst.dev.conveyal.com/tile',
      shapefileId : '0579b6bd8e14ec69e4f21e96527a684b_376500e5f8ac23d1664902fbe2ffc364',
      graphId     : '0ebb30ab8664001407b0ad524b102bd4',
      showIso     : true
    });
    var isoLayer = null

    this.dragendAction = function (marker, map) {

      if (false) {
        analyst.singlePointRequest({
          'lat' : marker.model.lat,
          'lng' : marker.model.lng
        })
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

      if (true) {
        analyst.vectorRequest({
          'lat' : marker.model.lat,
          'lng' : marker.model.lng
        })
        .then(function (response) {
          console.log(response);
        })
        .catch(function (err) {
          console.log(err)
        })
      }
    }
});





