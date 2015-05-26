angular.module('coaxsFilters', []).filter('integerLength', function() {
  return function(input) {
    if (input < 10) {
      input = '0' + String(input)
    }
    return input;
  };
});