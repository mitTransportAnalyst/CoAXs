coaxsApp.service('scorecardService', function () {

  this.generateBusScore = function (stopsLayer, stationType, id) {
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
      }
    });
    
    bus.dist[stationType] = 1;
    bus.cost = 10000*bus.dist[0] + 500000*bus.dist[1] + 1000000*bus.dist[2];
    
    var total = bus.dist[0] + bus.dist[1] + bus.dist[2];
    bus.dist[0] = bus.dist[0]/total;
    bus.dist[1] = bus.dist[1]/total;
    bus.dist[2] = bus.dist[2]/total;
    
    return bus;
  }

  this.generateLengthScore = function (routesLayer, id) {
    var length = {
      count  : 0,
      dist   : {
        non  : 0.75,
        ded  : 0.25,
      },
      cost   : 0,
    };
    routesLayer.eachLayer(function (route) {
      if (route.options.base.routeId == id) {
        length.count += route.options.base.length;
      }
    });
    length.cost = 4000000*length.dist.ded;
    return length;
  }

  this.generateTimeScore = function (routesLayer, id) {
    var loadTimePeak = 0;
    var time = {
      count  : 0,
      dist   : {
        move : 0,
        load : 0,
      },
    };
    routesLayer.eachLayer(function (route) {
      if (route.options.base.routeId == id) {
        time.count += route.options.base.halfCycleTimePeak;
        loadTimePeak = route.options.base.loadingTime;
      }
    });
    time.dist.move = (time.count-loadTimePeak)/time.count;
    time.dist.load = loadTimePeak/time.count;
    time.count = time.count/60;
    return time;
  }

  this.generateVehiclesScore = function (routesLayer, frequencies, id) { 
    var cycleTime = {
      peak : 0,
      off  : 0,
    };
    var vehicles = {
      count  : 20,
      cost   : 450000,
    };
    routesLayer.eachLayer(function (route) {
      if (route.options.base.routeId == id) {
        cycleTime.peak += route.options.base.halfCycleTimePeak;
        cycleTime.off  += route.options.base.halfCycleTimeOffPeak;
      }
    });
    vehicles.count = Math.ceil(cycleTime.peak/frequencies.peak);
    vehicles.cost = 160*255*((6*vehicles.count)+(12*(cycleTime.off/frequencies.off)));
    return vehicles;
  }


});











