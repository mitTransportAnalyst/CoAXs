var coaxsApp = angular.module('coaxsApp', ['coaxsFilters', 'ui.router', 'ui.bootstrap', 'leaflet-directive']);

coaxsApp.config(function($stateProvider, $urlRouterProvider) {
    
    $urlRouterProvider.otherwise('/maps');

    $stateProvider
        .state('maps', {
            url: '/maps',
            templateUrl: '/public/ng-views/maps.html',
            controller: 'mapsController'
        })
});


coaxsApp.run(function($rootScope) {
  $rootScope.Utils = {
    keys : Object.keys
  }
})






