appServices.factory('AuthenticationService', function () {
    var auth = {
        isLogged: false
    }
    return auth;
});

appServices.factory('TokenInterceptor', function ($q, $window, $location, AuthenticationService, $rootScope) {
    return {
        request: function (config) {
            config.headers = config.headers || {};
            if ($window.localStorage.token) {
                config.headers.Authorization = 'Bearer ' + $window.localStorage.token;
            }
            return config;
        },

        requestError: function(rejection) {
            return $q.reject(rejection);
        },

        /* Set Authentication.isAuthenticated to true if 200 received */
        response: function (response) {
            if (response != null && response.status == 200 && $window.localStorage.token && !AuthenticationService.isAuthenticated) {
                AuthenticationService.isAuthenticated = true;
                $rootScope.$broadcast('auth.change')
            }
            return response || $q.when(response);
        },

        /* Revoke client authentication if 401 is received */
        responseError: function(rejection) {
            if (rejection != null && rejection.status === 401 && ($window.localStorage.token || AuthenticationService.isAuthenticated)) {
                delete $window.localStorage.token;
                AuthenticationService.isAuthenticated = false;
                $rootScope.$broadcast('auth.change')
                $location.path("/login");
            }

            return $q.reject(rejection);
        },
    };
});

appServices.factory('UserService', function ($http) {
    return {

        currentUser: false,

        signIn: function(username, password, tipo) {
            return $http.post(options.api.base_url + '/user/login', {cuenta: username, clave: password, tipo: tipo});
        },

        logOut: function() {
            return $http.get(options.api.base_url + '/user/logout');
        },

        me: function( success, error ) {
            return $http.get(options.api.base_url + '/me?uuid=' + Math.floor(Math.random()*1000) +'-'+Date.now())
                        .success(success)
                        .error(error)        
        }
    }
});

appServices.factory('ApiService', function ($http, $rootScope) {
    return {
        
        cuenta : null,

        findCuenta: function( data ) {
            return $http.get(options.api.base_url + '/cuenta/find?cuenta=' + encodeURIComponent( data ) );
        },

        setCuenta: function( cuenta ) {
            return $http.post(options.api.base_url + '/cuenta/set/' + cuenta);
        },

        ctacte : function( err, success) {
        },

        pedidosRealizados: function( ) {
          return $http.get(options.api.base_url + '/mis-pedidos');
        },

        pedidosPendientes : function() {
          return $http.get(options.api.base_url + '/pedidos/pendientes');  
        },

        pedidoConfirmar: function() {
            return $http.post(options.api.base_url + '/pedidos/confirmar')
        },

        pedidosEliminarRegistro: function( registro ) {
          return $http.delete(options.api.base_url + '/pedidos/pendientes/' + registro );  
        },

        pedidosCancelar: function( ) {
            return $http.delete(options.api.base_url + '/pedidos/pendientes');
        },

        buscarProductoPorCodigo : function( data ) {
            return $http.get(options.api.base_url + '/productos/buscar?codProducto=' + encodeURIComponent( data ))
        },

        buscarProductoPorCodigoCliente : function( data ) {
            return $http.get(options.api.base_url + '/productos/buscar?codCliente=' + encodeURIComponent( data ))
        },

        crearPedido : function( obj ) {
            return $http.post(options.api.base_url + '/pedidos/crear', { productos : obj } );
        },

        crearCodigo : function( obj ) {
            return $http.post(options.api.base_url + '/productos/crearCodigo', { codigos : obj } );
        },

        // Stock
        stock : function( type, str ) {
            return $http.get(options.api.base_url + '/stock?type=' + type + '&str=' + str)            
        },

        // Cuenta
        cuenta: function( type ) {
            return $http.get(options.api.base_url + '/cuenta?type=' + type )
        },

        comprobante : function( tipoId, numeroId ) {
            return  $http.get(options.api.base_url + '/comprobante/' + tipoId + '/' + numeroId )
        }



    }
});

