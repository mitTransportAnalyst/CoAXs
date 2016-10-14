// crunches score for each component (row) of scorecard, should be self explanatory
coaxsApp.service('scorecardService', function () {

  this.updateRouteData = function(baseData, editParams, cb){
    var routeData = {};
	routeData.base = baseData.routeData;
	routeData.lines = baseData.buslines;
	routeData.edit = {};
	var vehicles = {base: 0, edit: 0};
	
	for (i in baseData.buslines){
      var line = baseData.buslines[i];
	  routeData.edit[line] = {};
	  
	  //segment speed in mph	
	  routeData.base[line].segmentSpeed = routeData.base[line].segmentDist/routeData.base[line].segmentTime * 60;
	  routeData.edit[line].segmentSpeed = routeData.base[line].segmentDist/(routeData.base[line].segmentTime*((100-editParams.runningTime)/100)) * 60;
	  
	  //total round-trip cycle time, in seconds
	  routeData.base[line].cycleTime = routeData.base[line].totalTime;
	  tt = routeData.base[line].totalTime;
	  st = (routeData.base[line].segmentTime*(editParams.runningTime/100));
	  dt = routeData.base[line].stops*10*(editParams.dwell)/100/60;
	  routeData.edit[line].cycleTime = (tt-st)-dt;
	  
	  
	  // (routeData.base[line].totalTime - (routeData.base[line].segmentTime*(editParams.runningTime/100)))*60 - routeData.base[line].stops*10*(editParams.dwellTime)/100;
	  
	  //total dwell time (based on assumption of 10 sec/stop
	  routeData.base[line].dwellTime = routeData.base[line].stops*10/60;
	  routeData.edit[line].dwellTime = routeData.base[line].stops*10*(100-editParams.dwell)/100/60;
	  
	  //headway
	  routeData.base[line].headway = routeData.base[line].baseHeadway;
	  routeData.edit[line].headway = routeData.base[line].baseHeadway * (100-editParams.headway)/100;
	  
	  vehicles.base = vehicles.base + Math.ceil(routeData.base[line].cycleTime/routeData.base[line].headway);
	  vehicles.edit = vehicles.edit + Math.ceil(routeData.edit[line].cycleTime/routeData.edit[line].headway)
	};
	routeData.base.vehicles = vehicles.base;
	routeData.edit.vehicles = vehicles.edit;
	
	cb(routeData);
  };

  // return an empty score card set of values
  this.generateEmptyScore = function () {
    var bus = {
      count  : 0,
      dist   : {
        0    : 0,
        1    : 0,
        2    : 0,
      },
      cost   : 0,
    };
    var length = {
      count  : 0,
      dist   : {
        non  : 0.75,
        ded  : 0.25,
      },
      cost   : 0,
    };
    var time = {
      count  : 0,
      dist   : {
        move : 0,
        load : 0,
      },
    };
    var vehicles = {
      count  : 0,
      cost   : 0,
    };
    return {
      bus : bus,
      length : length,
      time : time,
      vehicles : vehicles,
    }
  }

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

    var total = bus.dist[0] + bus.dist[1] + bus.dist[2];
    bus.dist[0] = bus.dist[0]/total;
    bus.dist[1] = bus.dist[1]/total;
    bus.dist[2] = bus.dist[2]/total;

    bus.cost = 10000*bus.dist[0]*bus.count + 500000*bus.dist[1]*bus.count + 1000000*bus.dist[2]*bus.count;
    
    return bus;
  }

  this.generateLengthScore = function (routesLayer, id) {
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
        var base = route.options.base;
        for (var i=0; i<base.priority.length; i++) {
          var diff = base.priority[i][1] - base.priority[i][0];
		  length.dist.ded += base.length*diff;
          	if (!base.default) {length.cost += 4000000*diff* base.length;} //If lines don't exist, give them a construction cost
		}
        length.count += route.options.base.length;
		}
	});
    length.dist.non = (length.count-length.dist.ded)/length.count;
	length.dist.ded = length.dist.ded/length.count;
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
      count  : 0,
      cost   : 0,
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











