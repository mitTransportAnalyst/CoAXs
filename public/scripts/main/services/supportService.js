coaxsApp.service('supportService', function () {

  this.generateUUID = function () {
    var d = Date.now();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
  };

  this.getLength = function(geometry) {
    if (geometry.type === 'LineString') { return calculateLength(geometry.coordinates); }
    else if (geometry.type === 'MultiLineString') {
      return geometry.coordinates.reduce(function(memo, coordinates) { return memo + calculateLength(coordinates); }, 0);
    }
    else { return null; }
  }

  function calculateLength(lineString) {
    if (lineString.length<2) { return 0; }
    var result = 0;
    for (var i=1; i<lineString.length; i++) {
        result += distance(lineString[i-1][0],lineString[i-1][1],
                           lineString[i  ][0],lineString[i  ][1]);
      }
    return result;
  }

  // © Chris Veness, MIT-licensed, http://www.movable-type.co.uk/scripts/latlong.html#equirectangular
  function distance(λ1,φ1,λ2,φ2) {
    var R = 3958.76; // miles
    Δλ = (λ2 - λ1) * Math.PI / 180;
    φ1 = φ1 * Math.PI / 180;
    φ2 = φ2 * Math.PI / 180;
    var x = Δλ * Math.cos((φ1+φ2)/2);
    var y = (φ2-φ1);
    var d = Math.sqrt(x*x + y*y);
    return R * d;
  };

});










