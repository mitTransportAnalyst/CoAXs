// this module handles front end filters which are piped through "|" bars between double brackets
angular.module('coaxsFilters', [])

// this just makes values all 2 characters long (and does not control for numbers greater than 100, because we do not run into them)
.filter('integerLength', function () {
  return function (input) {
    if (input < 10) {
      input = '0' + String(input)
    }
    return input;
  };
})


// UPDATED AVG WAIT TIME FILTER TO PREVENT NnN DEFAULT STATE
// this converts minute values in half for the purpose of getting avg wait times (and converts fractions into seconds)

.filter('avgWaitTime', function () {
  return function(input) {
    var min = Math.ceil(input/2);
	if (min <10) {min = '0' + String(min)};
    return min;
  }
})

// gives you the length of the array of the key values
.filter('keyLength', function () {
  return function (input){
    if (angular.isObject(input)) {
      return Object.keys(input).length;
    }
  };
})

// take and object and return an array of its keys
.filter('toArray', function () { 
  return function (input) {
    if (!(input instanceof Object)) { return input; }
    return Object.keys(input).map(function(k) {
      var val = input[k];
      val._key = k;
      return val;
    });
  }
})

// standardize minutes so that they all have the same number of characters in hh:mm format
.filter('minuteConverter', function () {
  return function (input) {
    input = Math.floor(Number(input));
    if (input < 10) {
      return String(input + ' min.');
    } else if (input < 60) {
      return String(input + ' min.');
    } else {
      var minutes = Math.floor(input%60);
      var hours = Math.floor(input/60);
      return String(hours + ' hr., ' + minutes + ' min.')
    }
  }
})

// convert a decimal to a percentage
.filter('convertPercentage', function () {
  return function (input) {
    return Number(input)*100;
  }
})

// standardize input lengths
.filter('vectorTimeValFilter', function () {
  return function (input) {
    input = String(input);
    if (input.length == 1) { return '00' + input }
    if (input.length == 2) { return '0' + input }
    if (input.length > 2) { return input }
  }
})

.filter('altNum', function () {
  return function (input) {
	return input.charAt(0);
  }
})

.filter('altNumInc', function () {
  return function (input) {
   if(input){
    return String.fromCharCode(input.charCodeAt(0)+1)+'|'+input.substring(2,input.length);}
  }
})

.filter('altAbbrev', function () {
  return function (input) {
    if(input){
	len = input.length;
	if (len > 17) {name = input.substring(0,15)+'...';}
	else{name = input};
	return name;}
  }
})

.filter('altName', function () {
  return function (input) {
    return input.substring(2,input.length);
  }
})