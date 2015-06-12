coaxsApp.service('scorecardService', function () {

  this.generateRouteScore = function () {


    var time = {
      count  : 75,
      dist   : {
        move : 30,
        load : 70,
      },
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

  this.generateBusScore = function (stopsLayer, id) {
    var bus = {
      count  : 0,
      dist   : {
        0    : 0,
        1    : 0,
        2    : 0,
      },
      cost   : 0,
    };
    stopsLayer.eachLayer(function (marker) {
      if (marker.options.base.stopId.includes(id)) {
        bus.count += 1;
        bus.dist[marker.options.base.stopType] += 1;
      }
    });
    bus.cost = 10000*bus.dist[0] + 500000*bus.dist[1] + 1000000*bus.dist[2];
    var total = bus.dist[0] + bus.dist[1] + bus.dist[2];
    bus.dist[0] = bus.dist[0]/total;
    bus.dist[1] = bus.dist[1]/total;
    bus.dist[2] = bus.dist[2]/total;
    return bus
  }

  this.generateLengthScore = function (routesLayer, id) { console.log(routesLayer);
    var length = {
      count  : 0,
      dist   : {
        non  : 0,
        ded  : 0,
      },
      cost   : 0,
    };
    routesLayer.eachLayer(function (route) {
      if (route.options.base.routeId == id) {
        length.count += route.options.base.length;
        bus.dist[route.options.base.stopType] += 1;
      }
    });
    bus.cost = 10000*bus.dist[0] + 500000*bus.dist[1] + 1000000*bus.dist[2];
    var total = bus.dist[0] + bus.dist[1] + bus.dist[2];
    bus.dist[0] = bus.dist[0]/total;
    bus.dist[1] = bus.dist[1]/total;
    bus.dist[2] = bus.dist[2]/total;
    return bus
  }

});











