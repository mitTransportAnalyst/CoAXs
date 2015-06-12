angular.module('coaxsFilters', [])

.filter('integerLength', function() {
  return function(input) {
    if (input < 10) {
      input = '0' + String(input)
    }
    return input;
  };
})

.filter('keyLength', function() {
  return function(input){
    if (angular.isObject(input)) {
      return Object.keys(input).length;
    }
  };
})

.filter('toArray', function() { 

  return function (obj) {
    if (!(obj instanceof Object)) { return obj; }
    return Object.keys(obj).map(function(k) {
      var val = obj[k];
      val._key = k;
      return val;
    })
    return result;
  }
});