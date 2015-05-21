(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Analyst = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var LAYER_DEFAULTS = {};

var REQUEST_DEFAULTS = {
  accessModes: 'WALK',
  egressModes: 'WALK',
  date: new Date().toISOString().split('T')[0],
  fromTime: 25200,
  toTime: 32400,
  walkSpeed: 1.3333333333333333,
  bikeSpeed: 4.1,
  carSpeed: 20,
  streetTime: 90,
  maxWalkTime: 20,
  maxBikeTime: 45,
  maxCarTime: 45,
  minBikeTime: 10,
  minCarTime: 10,
  suboptimalMinutes: 5,
  analyst: true,
  bikeSafe: 1,
  bikeSlope: 1,
  bikeTime: 1
};

/**
 * Create an instance of Analyst.js for use with single point requests.
 *
 * @param {Leaflet} L Pass in an instance of Leaflet so that it doesn't need to be packaged as a dependency.
 * @param {Object} opts Options object.
 * @example
 * const analyst = new Analyst(window.L, {
 *   apiUrl: 'http://localhost:3000/api',
 *   tileUrl: 'http://localhost:4000/tile'
 * })
 */

var Analyst = (function () {
  function Analyst(L) {
    var opts = arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Analyst);

    this.apiUrl  = opts.apiUrl;
    this.tileUrl = opts.tileUrl;

    this.shapefileId = opts.shapefileId;
    this.graphId     = opts.graphId;
    this.profile     = opts.profile === undefined ? true : opts.profile;

    this.connectivityType = opts.connectivityType || 'AVERAGE';
    this.timeLimit        = opts.timeLimit || 3600;
    this.showPoints       = !!opts.showPoints;
    this.showIso          = !!opts.showIso;

    this.L = L;

    this.requestOptions = Object.assign({}, REQUEST_DEFAULTS, opts.requestOptions);
    this.tileLayerOptions = Object.assign({}, LAYER_DEFAULTS, opts.tileLayerOptions);
  }

  _createClass(Analyst, [{
    key: 'updateSinglePointLayer',

    /**
     * Update/create the single point layer for this Analyst.js instance.
     *
     * @return {TileLayer} A Leaflet tile layer that pulls in the generated single point tiles.
     * @example
     * analyst.key = 'NEW KEY'
     * analyst.updateSinglePointLayer().redraw()
     */

    value: function updateSinglePointLayer() {
      var url = '' + this.tileUrl + '/single/' + this.key + '/{z}/{x}/{y}.png?which=' + this.connectivityType + '&timeLimit=' + this.timeLimit + '&showPoints=' + this.showPoints + '&showIso=' + this.showIso;

      if (!this.singlePointLayer) {
        this.singlePointLayer = this.L.tileLayer(url, this.tileLayerOptions);
      } else {
        this.singlePointLayer.setUrl(url);
      }

      return this.singlePointLayer;
    }
  }, {
    key: 'shapefiles',

    /**
     * Get all of the available shapefiles.
     *
     * @return {Promise} Resolves with a JSON list of shapefiles.
     * @example
     * analyst.shapefiles().then(function (shapefiles) {
     *   console.log(shapefiles)
     * })
     */

    value: function shapefiles() {
      return window.fetch(this.apiUrl + '/shapefiles').then(function (r) {
        return r.json();
      });
    }
  }, {
    key: 'singlePointRequest',

    /**
     * Run a single point request and generate a tile layer.
     *
     * @param {LatLng} point
     * @param {Object} opts
     * @return {Promise} Resolves with an object containing the tile layer and the results data.
     * @example
     * analyst
     *   .singlePointRequest(marker.getLatLng())
     *   .then(function (response) {
     *     response.tileLayer.addTo(map)
     *   })
     */

    value: function singlePointRequest(point) {
      var _this = this;

      var opts = arguments[1] === undefined ? {} : arguments[1];

      var options = Object.assign({}, this.requestOptions, opts);

      if (!point) return Promise.reject(new Error('Lat/lng point required.'));

      options.fromLat = options.toLat = point.lat;
      options.fromLon = options.toLon = point.lng;

      if (!this.shapefileId) return Promise.reject(new Error('Shapefile ID required'));
      if (!this.graphId) return Promise.reject(new Error('Graph ID required'));

      return post(this.apiUrl + '/single', {
        destinationPointsetId: this.shapefileId,
        graphId: this.graphId,
        profile: this.profile,
        options: options
      }).then(function (response) {
        return response.json();
      }).then(function (data) {
        _this.key = data.key;

        return {
          tileLayer: _this.updateSinglePointLayer(),
          results: data
        };
      });
    }
  }]);

  return Analyst;
})();

exports['default'] = Analyst;

function post(url, data) {
  return window.fetch(url, {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}
module.exports = exports['default'];

},{}]},{},[1])(1)
});