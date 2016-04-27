// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService, $http) {

	
  var defaultShapefile = '6204ae67-0a51-415c-8b86-c57185a3a941',
     defaultGraph = '53ab05a11caa3daef685ac214ef34e25';  

  var subjects = {
        prefix : 'Railplan_Joined',
		fields : {
		hh : { 
		  id: 'dem_jobs',
		  verbose : 'Jobs'
		}, 
		hh_zerocar: {
          id: 'em_whitec2',
          verbose: 'Jobs | White Collar',
        },
        totpop: {
          id: 'em_bluec20',
          verbose: 'Jobs | Blue Collar',
        },
        jobs_tot: {
          id: 'dem_pop',
          verbose: 'Residents',
        },
        retail: {
          id: 'dem_pworka',
          verbose: 'Residents | Working Age'
        },
        }
  };

  this.isochrones = null;
  
  var Analyst = window.Analyst;
  var analyst = new Analyst(window.L, {
    baseUrl		   : 'http://coaxs.mit.edu:9090',
	apiUrl         : 'http://coaxs.mit.edu:9090/api',
    tileUrl        : 'http://coaxs.mit.edu:9090/tile',
    shapefileId    : defaultShapefile,
    graphId        : defaultGraph,
	//showPoints	   : true,
    showIso        : true,
  });

  this.refreshCred = function () {$http.get('/credentials').success(function (token, status) { analyst.setClientCredentials(token); })};
  
  var optionCurrent = {
    scenario      : {
      id            : 0,
      description   : 'Run on load from CoAXs SPA.',
      modifications : [],
    }
  };
  
  var optionC = []
  
  optionC[0] = {
    scenario      : {
      id            : 0,
      description   : 'Scenario 0 from CoAXs',
      modifications : []
    }
  }; 
  
  optionC[1] = {
    scenario      : {
      id            : 1,
      description   : 'Scenario 1 from CoAXs',
      modifications : []
    },
  };
    
  var allRoutes = ['Worc','King','Fair','FitLake','FrankLow','Gree','NeedHave','NewRProv'];
  var agencyId = '99';
  var banExtraAgencies = [
    {
      type      : 'remove-trip',
      agencyId  : 'KM',
      routeId   : null,
      tripId    : null,
    }];

  // holds current states for different map layers, etc. (allows you to grab and remove, replace)
  var isoLayer   = null;

  var vectorIsos = null;
  var vecComIsos = null;
  
  var currentIso = null;
  var compareIso = null;


  // clear out everything that already exists, reset opacities to defaults
  this.resetAll = function (map, c) {
    if (isoLayer)   { isoLayer.setOpacity(1); };
    if (currentIso) { map.removeLayer(currentIso); };
    if (compareIso) { map.removeLayer(compareIso); };
    optionC[c].scenario.modifications = []
	optionC[c].scenario.modifications.push(banExtraAgencies[0]); // empty contents of the modifications list entirely
  };

  this.killCompareIso = function (map) {
    if (compareIso) { map.removeLayer(compareIso); };
    vecComIsos = false;
    compareIso = null;
  };

  // filter through and remove routes that we don't want banned on each scenario SPA call
  this.modifyRoutes = function (keepRoutes, c) { 
    keepRoutes = keepRoutes.map(function (route) { return route.routeId;  }); // we just want an array of routeIds, remove all else
    var rmRoutes = allRoutes.filter(function (route) { return keepRoutes.indexOf(route) < 0; });
    var routesMod = {
      type      : 'remove-trip',
      agencyId  : rmRoutes.length > 0 ? agencyId : null,
      routeId   : rmRoutes,
      tripId    : null,
    };
    optionC[c].scenario.modifications.push(routesMod);
  };

  this.modifyDwells = function (keepRoutes, c) {
    var dwell10 = keepRoutes.filter(function (route) { return route.station == 2; }).map(function (route) { return route.routeId; });
    var dwell20 = keepRoutes.filter(function (route) { return route.station == 1; }).map(function (route) { return route.routeId; });
    var dwell30 = keepRoutes.filter(function (route) { return route.station == 0; }).map(function (route) { return route.routeId; });

    var dwellMod = {
      type: 'adjust-dwell-time',
      agencyId: agencyId,
      routeId: [],
      tripId: null,
      stopId: null,
      dwellTime: 30,
    };
    if (dwell10.length > 0) {
      dwellMod.routeId = dwell10; dwellMod.dwellTime = 10;
      optionC[c].scenario.modifications.push(angular.copy(dwellMod));
    };
    if (dwell20.length > 0) {
      dwellMod.routeId = dwell20; dwellMod.dwellTime = 20;
      optionC[c].scenario.modifications.push(angular.copy(dwellMod));
    };
    if (dwell30.length > 0) {
      dwellMod.routeId = dwell30; dwellMod.dwellTime = 30;
      optionC[c].scenario.modifications.push(angular.copy(dwellMod));
    };
  };

  this.modifyFrequencies = function (keepRoutes, c) {
    keepRoutes = keepRoutes.map(function (route) { 
      return {
        routeId: route.routeId,
        frequency: route.peak.min * 60 + route.peak.sec
      };
    });

    keepRoutes.forEach(function (route) {
      optionC[c].scenario.modifications.push({
        type: 'adjust-headway',
        agencyId: agencyId,
        routeId: [route.routeId],
        tripId: null,
        headway: route.frequency,
      });
    });
  }

  this.modifyModes = function (routeTypes) {
    optionC[c].scenario.modifications.push({
      type: 'remove-trip',
      agencyId: agencyId,
      routeId: null,
      tripId: null,
      routeType: routeTypes
    });
  }

  this.loadExisting = function (poi, map, cb) {
    vectorIsos = poi.isochrones;
    analyst.singlePointRequest({
      lat : poi.lat,
      lng : poi.lng,
    }, defaultGraph, defaultShapefile, optionCurrent)
    .then(function (response) {
      if (isoLayer) {
        isoLayer.redraw(); 
      } else {
        isoLayer = response.tileLayer;
        isoLayer.addTo(map);
      }
      cb(true);
    })
    .catch(function (err) {
      console.log(err);
      cb(false);
    });;
  }

  this.singlePointComparison = function (marker, map, cb) {
   	console.log(optionC[0]);
	console.log(optionC[1]);
	
	analyst.singlePointComparison({
      lat : marker.lat,
      lng : marker.lng,
    }, defaultGraph, defaultShapefile, optionC[1], optionC[0])
		.then(function (response) {
			var plotData = {};
			var cPlotData = {};
			
			//compile cumulative plot data for scenario 1
			for (key in subjects.fields) {
				var id = subjects.prefix+'.'+subjects.fields[key].id;
				var tempArray = response[0].data[id].pointEstimate.sums.slice(0,120);
				for (var i = 1; i < tempArray.length; i++) { 	tempArray[i] = tempArray[i] + tempArray[i-1] };
				cPlotData[key] = {
					'data' : tempArray.map(function(count, i) { return { x : i, y : count } }),
					'verbose' : subjects.fields[key].verbose
					}
				};
			
			//compile cumulative plot data for scenario 0
			for (key in subjects.fields) {
				var id = subjects.prefix+'.'+subjects.fields[key].id;
				var tempArray = response[1].data[id].pointEstimate.sums.slice(0,120);
				for (var i = 1; i < tempArray.length; i++) { 	tempArray[i] = tempArray[i] + tempArray[i-1] };
				plotData[key] = {
					'data' : tempArray.map(function(count, i) { return { x : i, y : count } }),
					'verbose' : subjects.fields[key].verbose
					}
				};
			// };
			isoLayer = analyst.updateSinglePointLayer(response[0].key, response[1].key);
			isoLayer.addTo(map);
		cb(response[0], response[1], plotData, cPlotData);
		})
  }
  
  // actually run the SPA and handle results from library
  this.singlePointRequest = function (marker, map, cb) {
	analyst.singlePointRequest({
      lat : marker.lat,
      lng : marker.lng,
    }, defaultGraph, defaultShapefile, optionC[0])
    .then(function (response) { 
        isoLayer = analyst.updateSinglePointLayer(response.key);
		isoLayer.addTo(map);  
	  var plotData = subjects.fields;
      for (key in subjects.fields) {
        var id = subjects.prefix+'.'+subjects.fields[key].id;
        var tempArray = response.data[id].pointEstimate.sums.slice(0,120);
        for (var i = 1; i < tempArray.length; i++) { 	tempArray[i] = tempArray[i] + tempArray[i-1] };
        plotData[key]['data'] = tempArray.map(function(count, i) { return { x : i, y : count } });
      }
      cb(response.key, plotData);
    })
    .catch(function (err) {
      console.log(err);
    });
  };

  // explicitly run request for vector isochrones
  this.vectorRequest = function (marker, compareTrue, cb) {
	//single-point request for baseline scenario, with null destination shapefile null to retrieve vector isochrones
	analyst.singlePointRequest({
      lat : marker.lat,
      lng : marker.lng,
    }, defaultGraph, null, optionC[0])
    .then(function (response) {
      //then, if a comparison, run a second single-point request for new scenario, with null destination shapefile null to retrieve vector isochrones
	  if (compareTrue) { 
		vecComIsos = response.isochrones;
		analyst.singlePointRequest({
			lat : marker.lat,
			lng : marker.lng,
		}, defaultGraph, null, optionC[1])
		.then(function (response) {
			vectorIsos = response.isochrones;
			cb(response.key, true);
		}
	  )}
      else { 
		vectorIsos = response.isochrones; 
		cb(response.key, true);
	  }
    });
  };

  // swap between tile layer and vector isos layer
  this.showVectorIsos = function(timeVal, map) {
    if (isoLayer) { isoLayer.setOpacity(0) };
    if (currentIso) { map.removeLayer(currentIso); };
    if (compareIso) { map.removeLayer(compareIso); };

    var isosArray = vectorIsos.pointEstimate.features;
    for (var i=0; i<isosArray.length; i++) { 
      if (isosArray[i].properties.time == timeVal) { 
        currentIso = L.geoJson(isosArray[i], {
          style: {
            stroke      : true,
            fillColor   : '#FDB813',
            color       : '#F68B1F',
            weight      : 1,
            fillOpacity : 0.25,
            opacity     : 1
          }
        });
        currentIso.addTo(map);
      }
    }

    if (vecComIsos) {
      var isosArray = vecComIsos.pointEstimate.features;
      for (var i=0; i<isosArray.length; i++) { 
        if (isosArray[i].properties.time == timeVal) { 
          compareIso = L.geoJson(isosArray[i], {
            style: {
              stroke      : true,
              fillColor   : '#89cff0',
              color       : '#45b3e7',
              weight      : 1,
              fillOpacity : 0.25,
              opacity     : 1
            }
          });
          compareIso.addTo(map);
        }
      }  
    }
  };

});






