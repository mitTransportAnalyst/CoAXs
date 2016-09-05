// this handles interactions with the analyst.js library, read the library's readme for further examples and details
coaxsApp.service('analystService', function (supportService, $http) {

	
  var defaultShapefile = '6f0207c4-0759-445b-bb2a-170b81bfeec6',
     defaultGraph = '620e6749074235d5450f969bf5878a83';  

  var subjects = {
        prefix : 'lodes',
		fields : {
		wt_const1	:	{id:"wt_const1"	,	verbose:	 'Manufact. & Constr. | $'	},
		wt_const2	:	{id:"wt_const2"	,	verbose:	 'Manufact. & Constr. | $$'	},
		wt_const3	:	{id:"wt_const3"	,	verbose:	 'Manufact. & Constr. | $$$'	},
		wt_educa1	:	{id:"wt_educa1"	,	verbose:	 'Education | $'	},
		wt_educa2	:	{id:"wt_educa2"	,	verbose:	 'Education | $$'	},
		wt_educa3	:	{id:"wt_educa3"	,	verbose:	 'Education | $$$'	},
		wt_finan1	:	{id:"wt_finan1"	,	verbose:	 'Finance | $'	},
		wt_finan2	:	{id:"wt_finan2"	,	verbose:	 'Finance | $$'	},
		wt_finan3	:	{id:"wt_finan3"	,	verbose:	 'Finance | $$$'	},
		wt_healt1	:	{id:"wt_healt1"	,	verbose:	 'Health Care | $'	},
		wt_healt2	:	{id:"wt_healt2"	,	verbose:	 'Health Care | $$'	},
		wt_healt3	:	{id:"wt_healt3"	,	verbose:	 'Health Care | $$$'	},
		wt_hospi1	:	{id:"wt_hospi1"	,	verbose:	 'Hospitality | $'	},
		wt_hospi2	:	{id:"wt_hospi2"	,	verbose:	 'Hospitality | $$'	},
		wt_hospi3	:	{id:"wt_hospi3"	,	verbose:	 'Hospitality | $$$'	},
		wt_infor1	:	{id:"wt_infor1"	,	verbose:	 'Information Services | $'	},
		wt_infor2	:	{id:"wt_infor2"	,	verbose:	 'Information Services | $$'	},
		wt_infor3	:	{id:"wt_infor3"	,	verbose:	 'Information Services | $$$'	},
		wt_profe1	:	{id:"wt_profe1"	,	verbose:	 'Professional Services | $'	},
		wt_profe2	:	{id:"wt_profe2"	,	verbose:	 'Professional Services | $$'	},
		wt_profe3	:	{id:"wt_profe3"	,	verbose:	 'Professional Services | $$$'	},
		wt_publi1	:	{id:"wt_publi1"	,	verbose:	 'Public Administration | $'	},
		wt_publi2	:	{id:"wt_publi2"	,	verbose:	 'Public Administration | $$'	},
		wt_publi3	:	{id:"wt_publi3"	,	verbose:	 'Public Administration | $$$'	},
		wt_trade1	:	{id:"wt_trade1"	,	verbose:	 'Retail & Wholesale | $'	},
		wt_trade2	:	{id:"wt_trade2"	,	verbose:	 'Retail & Wholesale | $$'	},
		wt_trade3	:	{id:"wt_trade3"	,	verbose:	 'Retail & Wholesale | $$$'	},
		wt_trans1	:	{id:"wt_trans1"	,	verbose:	 'Utilities & Transport | $'	},
		wt_trans2	:	{id:"wt_trans2"	,	verbose:	 'Utilities & Transport | $$'	},
		wt_trans3	:	{id:"wt_trans3"	,	verbose:	 'Utilities & Transport | $$$'	},
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
    
var allRoutes = ['CR-Fairmount', '749', '2b8cb87', '3c84732', '364b0b2', 'a3e69c4', '9d14048', '62e5305', 'a64adac', 'b35db84', '79d4855', '78cc24d'];
var agencyId = 'MBTA+v6';
var banExtraAgencies = [
    {
      type      : 'remove-trip',
      agencyId  : 'KM',
      routeId   : null,
      tripId    : null,
    }];

  // holds current states for different map layers, etc. (allows you to grab and remove, replace)
  var isoLayer   = null;
  var isoLayerOld = null;

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
  this.singlePointRequest = function (marker, map, timeLimit, cb) {
	analyst.singlePointRequest({
      lat : marker.lat,
      lng : marker.lng,
    }, defaultGraph, defaultShapefile, optionC[0])
    .then(function (response) { 
        isoLayer = analyst.updateSinglePointLayer(response.key, null, timeLimit);
		isoLayer.addTo(map).on('load', function(e){
			isoLayer.setOpacity(1);
			isoLayerOld.setOpacity(0);
			isoLayerOld = analyst.updateSinglePointLayerOld(response.key, null);
		});
		isoLayerOld = analyst.updateSinglePointLayerOld(response.key, null);
		isoLayerOld.addTo(map);
		console.log(isoLayer);
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
  
  this.updateTiles = function(map, key, timeLimit, cb) {
	isoLayerOld ? '' : isoLayerOld = isoLayer;
	isoLayerOld.setOpacity(1);
	isoLayer.setOpacity(0);
	isoLayer = analyst.updateSinglePointLayer(key, null, timeLimit);
	}
  //

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
    if (isoLayer) { isoLayer.setOpacity(0)
	};
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






