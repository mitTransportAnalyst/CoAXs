coaxsApp.service('scorecardService', function () {

  this.generateRouteScore = function () {


    var bus = {
      count  : 40,
      dist   : {
        0    : 25,
        1    : 35,
        2    : 40,
      },
      cost   : 300000,
    };
    var length = {
      count  : 4.6,
      dist   : {
        non  : 40,
        ded  : 60,
      },
      cost   : 550000,
    };
    var time = {
      count  : 75,
      dist   : {
        move : 30,
        load : 70,
      },
      cost   : 120000,
    };
    var vehicles = {
      count  : 20,
      cost   : 450000,
    };

    return {
      bus      : bus,
      length   : length,
      time     : time,
      vehicles : vehicles,
    }
  }

});



