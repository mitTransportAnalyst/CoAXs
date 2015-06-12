angular.module('coaxsFilters', [])

.filter('integerLength', function () {
  return function (input) {
    if (input < 10) {
      input = '0' + String(input)
    }
    return input;
  };
})

.filter('keyLength', function () {
  return function (input){
    if (angular.isObject(input)) {
      return Object.keys(input).length;
    }
  };
})

.filter('toArray', function () { 
  return function (input) {
    if (!(input instanceof Object)) { return input; }
    return Object.keys(input).map(function(k) {
      var val = input[k];
      val._key = k;
      return val;
    })
    return result;
  }
})

.filter('minuteConverter', function () {
  return function (input) {
    input = Number(input);
    if (input < 10) {
      return String('0:0' + input);
    } else if (input < 60) {
      return String('0:' + input);
    } else {
      var minutes = input%60;
      var hours = Math.floor(input/60);
      return String(hours + ':' + minutes)
    }
  }
});