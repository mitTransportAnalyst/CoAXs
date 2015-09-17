// this is the main router and allows you to create multiple views the main app (currently we only have one)

var coaxsApp = angular.module('coaxsApp', ['ngRoute', 'coaxsFilters', 'ui.router', 'ui.bootstrap', 'leaflet-directive']);

coaxsApp.config(function($stateProvider, $urlRouterProvider) {
    
    $urlRouterProvider.otherwise('/maps');

    $stateProvider
        .state('maps', {
            url: '/maps',
            templateUrl: '/public/ng-views/maps.html',
            controller: 'mapsController'
        })
});






