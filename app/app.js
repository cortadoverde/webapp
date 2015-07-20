
var app = angular.module('TabaApp', ['ngRoute', 'appControllers', 'appServices', 'appDirectives', 'taba.shortcuts', 'ngDialog']);

var appServices    = angular.module('appServices', []);
var appControllers = angular.module('appControllers', ['ngDialog']);
var appDirectives  = angular.module('appDirectives', []);

var options = {};
options.api = {};
options.api.base_url = "http://192.168.0.105:8080/api";

app.config(['$locationProvider', '$routeProvider', 
  function($location, $routeProvider) {
    $routeProvider.
        
        when('/', {
            templateUrl: 'partials/pedidos.html',
            controller: 'PedidosCtrl',
            access: { requiredAuthentication: true }
        }).
        
        when('/login', {
            templateUrl: 'partials/user.signin.html',
            controller: 'AdminUserCtrl',
            show : { login: false }
        }).
        
        when('/logout', {
            templateUrl: 'partials/user.logout.html',
            controller: 'LogoutCtrl',
            access: { requiredAuthentication: true }
        }).
        when('/cuenta-corriente',{
            templateUrl: 'partials/cuenta-corriente.html',
            controller: 'CuentaCtrl',
            access : { requiredAuthentication : true }
        }).

        when('/ver-pedidos',{
            templateUrl: 'partials/pedidos_realizados.html',
            controller: 'VerPedidosCtrl',
            access : { requiredAuthentication : true }
        }).

        when('/disponibilidad',{
            templateUrl: 'partials/disponibilidad.html',
            controller: 'DisponibilidadCtrl',
            access : { requiredAuthentication : true }
        }).

        when('/archivos',{
            templateUrl: 'partials/descargas.html',
            controller: 'ArchivosCtrl',
            access : { requiredAuthentication : true }
        }).

        when('/personalizar-codigos',{
            templateUrl: 'partials/personalizar-codigos.html',
            controller: 'CodigoClienteCtrl',
            access : { requiredAuthentication : true }
        }).

        otherwise({
            redirectTo: '/'
        });
}]);


app.config(function ($httpProvider) {
    $httpProvider.interceptors.push('TokenInterceptor');
});

app.run(function($rootScope, $location, $window, AuthenticationService, $http, UserService) {
 
    $rootScope.mode = {
        display: false,
        search: true
    }

    $rootScope.changeMode = function( type ) {
        if( type == 'display' ) {
            $rootScope.mode.display = true;
            $rootScope.mode.search = false;
        } else {
            $rootScope.mode.display = false;
            $rootScope.mode.search = true;
        }
    }

    $rootScope.loadInt = 0;
    
    $rootScope.AppReady = false;

    function logOut() {
        $rootScope.changeMode('search');
        UserService.logOut().success(function(data) {
            AuthenticationService.isAuthenticated = false;
            $rootScope.auth = {};
            $rootScope.auth.logged = false;
            delete $window.localStorage.token;
            $rootScope.$broadcast('auth.change')
        }).error(function(status, data) {
            delete $window.localStorage.token;
            $rootScope.$broadcast('auth.change')
        });
    }

    $rootScope.logOut = logOut;

    $rootScope.empresa = {};

    $http.get(options.api.base_url + '/about').success(function(data){
      $rootScope.empresa = data;
      $rootScope.$broadcast('empesa.ready');
    })

    if( $window.localStorage.token ) {
        UserService.me(function(data){
            AuthenticationService.isAuthenticated = true;
            $rootScope.$broadcast('auth.change')
        }, function(){
            $rootScope.$broadcast('auth.change')
        })
        
    }

    $rootScope.auth = { logged : false };



    $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {     
       
        if( nextRoute.$$route && nextRoute.$$route.templateUrl && nextRoute.$$route.templateUrl == 'partials/user.logout.html' ){
            logOut();
            $location.path("/login");
        }
        //redirect only if both isAuthenticated is false and no token is set
        if (nextRoute != null && nextRoute.access != null && nextRoute.access.requiredAuthentication 
            && !AuthenticationService.isAuthenticated && !$window.localStorage.token) {
            $location.path("/login");
        }
        // redireccionar a la home si no ya esta logueado
        if( nextRoute != null && nextRoute.show != null && !nextRoute.show.login && !AuthenticationService.isAuthenticated && $window.localStorage.token ) {
          $location.path("/");
        }
        
    });



    

    
});


app.filter('procesoEstado', function() {
    return function( estado ) {
        if( estado == 2 ) {
            return 'En proceso';
        } 
        return 'completado';
    }
})

app.filter('debe', function(){
    return function( value ) {
        if( value >= 0 ) {
            return value;
        }
        return null;
    }
})

app.filter('haber', function(){
    return function( value ) {
        if( value < 0 ) {
            return value * -1 ;
        }
        return null;
    }
})