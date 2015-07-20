
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
appControllers.controller('AdminUserCtrl', ['$scope', '$location', '$window', 'UserService', 'AuthenticationService', '$rootScope', 
    function AdminUserCtrl($scope, $location, $window, UserService, AuthenticationService, $rootScope) {
  
        //Admin User Controller (signIn, logOut)
        $scope.signIn = function signIn(username, password) {
            if (username != null && password != null) {
                
                var tipo = $scope.user.es_vendedor ? 'vendedor' : 'cliente';

                UserService.signIn(username, password, tipo).success(function(data) {
                    AuthenticationService.isAuthenticated = true;
                    $rootScope.auth.logged = true;
                    UserService.curretUser = data;
                    $window.localStorage.token = data.token;
                    $rootScope.$broadcast('auth.change')
                }).error(function(status, data) {
                    $rootScope.$broadcast('auth.change')
                });
                
            }
        }


    }
]);

appControllers.controller('LogoutCtrl',function ($scope){

})

appControllers.controller('CuentaCtrl', function($scope, $rootScope, ApiService, ngDialog){
    $scope.pendings = $scope.resumen = [];
    $scope.state = 'pending';
    $scope.switchTo = 'resumen';

    $scope._load = function() {
        ApiService.cuenta($scope.state)
            .success(function( data ){
                if( $scope.state == 'pending' ) {
                    $scope.pendings = data;
                } else {
                    $scope.resumenSaldo = data.SaldoInicial;
                    $scope.resumen = data.Items;
                }
            })
    }

    $scope.$watch('state', function(n, o){
        if( n == 'pending' ) {
            $scope.resumen = [];
            $scope.resumenSaldo = 0;
            $scope.switchTo = 'Resumen de cuenta corriente';
        } else {
            $scope.pendings = [];
            $scope.switchTo = 'Pendientes por cobrar';
        }
        $scope._load();        
    })

    $rootScope.$on('app.ready', function(){
        $scope._load();
    })

    $scope.changeState = function() {
        $scope.state = $scope.state == 'pending' ? 'resumen' : 'pending';
    }

    $scope.calcSaldo = function( index ) {
       var totales =  _.pluck( $scope.pendings, 'Saldo' ) ;
       return _.sum(totales.slice(0, index + 1 ));
    }

    $scope.calcSaldoResumen = function( index ) {
       var totales =  _.pluck( $scope.resumen, 'ImporteCbte' ) ;
       return  $scope.resumenSaldo + _.sum(totales.slice(0, index + 1 ));
    }

    $scope.ver_comprobante = function(event, tipoId, numeroId ) {
        event.preventDefault();

        ApiService.comprobante(tipoId, numeroId)
            .success(function( comprobante ){
                $scope.factura = comprobante;
                ngDialog.open({
                    template : 'partials/comprobante.html',
                    className: 'ngdialog-theme-default',
                    scope : $scope
                })
            })
    }




})


appControllers.controller('PedidosCtrl', function ($scope, ApiService, $rootScope, ngDialog) {
    $scope.pendings = $scope.resultados =  [];
    $scope.order = {};
    $scope.showPrice =  false;
    $scope.showCantidad = false;
    $scope.all = true;
    var chk = function() {
        $scope.showPrice = $rootScope.auth._type == 'vendedor' ? true : $rootScope.empresa.verPrecio;
        $scope.showCantidad = $rootScope.auth._type == 'vendedor' ? true : $rootScope.empresa.verCantidad;
    }

    ApiService.pedidosPendientes()
    .success(function(items){
        chk();
        $scope.pendings = items;
    })
    .error(function( data, status){
    })

    $rootScope.$on('app.ready', function(){
        chk();
        $scope.getPendings();
    })

    $scope.getPendings = function() {
        ApiService.pedidosPendientes()
        .success(function(items){
            $scope.pendings = items;
        })
        .error(function( data, status){
        })
    }
    $scope.confirm = function() {
        ApiService.pedidoConfirmar()
            .success(function(data){
                $scope.getPendings();
            })
    }    
    
    $scope.deleteAll = function(e) {
        e.preventDefault()
        if( confirm(' Seguro que desea eliminar este registro ?') ) {
            ApiService.pedidosCancelar()
                .success(function(data){
                    $scope.getPendings();
                })
        }
    }

    $scope.deleteItem = function( registro ) {
        if( confirm(' Seguro que desea eliminar este registro ?') ) {
            ApiService.pedidosEliminarRegistro( registro )
                .success(function(){
                    $scope.getPendings();
                })
        }
    }

    $scope.buscarCodigoProducto = function() {
        ApiService.buscarProductoPorCodigo( $scope.search )
            .success(function( items ) {
                $scope.resultados = items;
            })
    } 

    $scope.buscarCodigoCliente = function() {
        ApiService.buscarProductoPorCodigoCliente( $scope.search )
            .success(function( items ) {
                $scope.resultados = items;
            })
    } 

    $scope.crearPedido = function() {
         console.log( $scope.order ); 
         if( confirm( 'Procesar estos items' ) ) {
             ApiService.crearPedido( $scope.order )
                .success(function( ) {
                    $scope.getPendings();
                    $scope.resultados = [];
                })
        }
    } 

    $scope.evalKey = function( event ) {
        if( event.keyCode && event.keyCode == '13' ) {
            $scope.buscarCodigoProducto();
        }
    }

    $scope.importarExcel = function() {
        var o = {};
        var error = [];

        console.log( $scope.columna );
        var colCodProducto = _.findKey( $scope.columna, function( str ) { return str == 'codProducto' } ).toUpperCase();
        var colCantidad    = _.findKey( $scope.columna, function( str ) { return str == 'cantidad' } ).toUpperCase();
        var colDetalle     = _.findKey( $scope.columna, function( str ) { return str == 'detalle' } ).toUpperCase();
        
        _.forEach($scope.cellOrder, function(obj, index) {
            if( obj.import ) {
                var codProducto = obj[colCodProducto].toString().toUpperCase();
                var cantidad = obj[colCantidad];
                var detalle  = obj[colDetalle];
                if( isNaN( cantidad ) ) {
                    error.push('la columna ' + ( parseInt(index) + 1 ) + ' cantidad tiene que contener numeros para poder hacer el pedido');
                }
                if( ! o.hasOwnProperty( codProducto ) ) {
                    o[codProducto] = {
                        cantidad: cantidad,
                        detalle : detalle
                    }
                } else {
                    o[codProducto].cantidad = parseInt(o[codProducto].cantidad) + parseInt(cantidad);
                   // o[codProducto].detalle = o[codProducto].detalle + ' / ' + detalle;
                }
            }
        })
        if( ! _.isEmpty( o ) &&  error.length == 0 ) {
            ApiService.crearPedido( o )
                .success(function( ) {
                    $scope.getPendings();
                    $scope.dialog.close()
                })
        } else {
            alert( error.join('\n') );
        }
    }    

    $scope.checkAll = function() {
        console.log( $scope.all );
        if( $scope.all ) {
            $scope.all = false;
        } else {
            $scope.all = true;
        }

        console.log($scope.checkAllItemes);
        console.log($scope);

        _.forEach($scope.cellOrder,function(n, idx){
            $scope.cellOrder[idx].import = $scope.all;
        });   
    }


    $scope.showContent = function($fileContent){
        
        $scope.checkAllItemes = true;

        $scope._data   = $fileContent;
        $scope._xls = obj = XLS.read($fileContent, {type: 'binary'})
        $scope.columna = {
            a : 'codProducto',
            b : 'cantidad',
            c : 'detalle'
        };

        $scope.cellOrder = {};

        var name = obj.SheetNames[0];
        var csv = XLS.utils.sheet_to_csv(obj.Sheets[name]);

        var lines = _.compact(csv.split("\n")); var result = [];

        var lines = _.filter(lines, function( csvline ) {
            return _.compact(csvline.split(",")).length > 0;
        })

        for(var i=0;i<lines.length;i++){
            var obj = {};
            var currentline=lines[i].split(",");
            for(var j=0;j<lines[0].length;j++){
               var idx = String.fromCharCode(65 + j);
               obj[idx] = currentline[j];
            }
         
            result.push(obj);
        }


        $scope.cells = result;

        $scope.dialog = ngDialog.open({
            template : 'partials/import_excel.html',
            className: 'ngdialog-theme-default',
            scope : $scope
        })
        
    };
});

appControllers.controller('VerPedidosCtrl', function ($rootScope, $scope, ApiService){
    $scope.items = [];

    ApiService.pedidosRealizados()
        .success(function(items){
            $scope.items = items;
        })
        .error(function( data, status){
        })

    $rootScope.$on('app.ready', function(){       
        ApiService.pedidosRealizados()
        .success(function(items){
            $scope.items = items;
        })
        .error(function( data, status){
        })
    })

})

appControllers.controller('DisponibilidadCtrl', function ( $rootScope, $scope, ApiService){
    $scope.items = [];
    $scope.search = '';

    $scope.buscarCodigoProducto = function() {
        ApiService.stock('codProducto', $scope.search )
            .success(function( items ) {
                $scope.items = items;
            })
    }

    $scope.buscarCodigoCliente = function() {
        ApiService.stock('codCliente', $scope.search )
            .success(function( items ) {
                $scope.items = items;
            })
    }

    $scope.getDisplay = function( item ) {
        if( item.stockactual1 > item.stockminimo ) {
            return '<b>disponible</b>';
        } else {
            if( item.stockactual1  > 0 ) {
                return '<b>consultar</b>';
            } else {
                return '<b>No disponible</b>';
            }
        }
    }

    $scope.evalKey = function( event ) {
        if( event.keyCode && event.keyCode == '13' ) {
            $scope.buscarCodigoProducto();
        }
    }
})

appControllers.controller('ArchivosCtrl', function ( $rootScope, $scope, ApiService){

})

appControllers.controller('CodigoClienteCtrl', function ( $rootScope, $scope, ApiService, ngDialog){
    $scope.code = {};

    $scope.buscarCodigoProducto = function() {
        ApiService.buscarProductoPorCodigo( $scope.search )
            .success(function( items ) {
                $scope.resultados = items;
            })
    }

    $scope.crearCodigo = function() {

        ApiService.crearCodigo( $scope.code )
            .success(function( ) {
                $scope.resultados = [];
            })
    }

    $scope.evalKey = function( $event ) {
        if( $event.keyCode && $event.keyCode == '13' ) {            
            $scope.buscarCodigoProducto();
        }
    }

    $scope.importarExcel = function() {
        var o = {};
        var error = [];

        console.log( $scope.columna );
        var colCodProducto = _.findKey( $scope.columna, function( str ) { return str == 'codigoProducto' } ).toUpperCase();
        var colCodCliente  = _.findKey( $scope.columna, function( str ) { return str == 'codigoCliente' } ).toUpperCase();
        var colDetalle     = _.findKey( $scope.columna, function( str ) { return str == 'nombre' } ).toUpperCase();
        
        _.forEach($scope.cellOrder, function(obj, index) {
            if( obj.import ) {
                var codProducto = obj[colCodProducto].toString().toUpperCase();
                var codCliente  = obj[colCodCliente];
                var detalle     = obj[colDetalle];
         
                if( ! o.hasOwnProperty( codProducto ) ) {
                    o[codProducto] = {
                        codigo: codCliente,
                        nombre : detalle
                    }
                } 
            }
        });

        if( ! _.isEmpty( o ) &&  error.length == 0 ) {
            ApiService.crearCodigo( o )
                .success(function( ) {
                    $scope.dialog.close();
                    $scope.buscarCodigoProducto();
                })
        } else {
            alert( error.join('\n') );
        }
    }    

    $scope.checkAll = function() {
        console.log( $scope.all );
        if( $scope.all ) {
            $scope.all = false;
        } else {
            $scope.all = true;
        }

        console.log($scope.checkAllItemes);
        console.log($scope);

        _.forEach($scope.cellOrder,function(n, idx){
            $scope.cellOrder[idx].import = $scope.all;
        });   
    }


    $scope.showContent = function($fileContent){
        
        $scope.checkAllItemes = true;

        $scope._data   = $fileContent;
        $scope._xls = obj = XLS.read($fileContent, {type: 'binary'})
        $scope.columna = {
            a : 'codigoProducto',
            b : 'codigoCliente',
            c : 'nombre'
        };

        $scope.cellOrder = {};

        var name = obj.SheetNames[0];
        var csv = XLS.utils.sheet_to_csv(obj.Sheets[name]);

        var lines = _.compact(csv.split("\n")); var result = [];
        var lines = _.filter(lines, function( csvline ) {
            return _.compact(csvline.split(",")).length > 0;
        })

        console.log(lines);
        for(var i=0;i<lines.length;i++){
            var obj = {};
            var currentline=lines[i].split(",");
            for(var j=0;j<lines[0].length;j++){
               var idx = String.fromCharCode(65 + j);
               obj[idx] = currentline[j];
            }
         
            result.push(obj);
        }


        $scope.cells = result;

        $scope.dialog = ngDialog.open({
            template : 'partials/import_excel_codigo.html',
            className: 'ngdialog-theme-default',
            scope : $scope
        })
        
    };
})

appControllers.controller('findUserCtrl', function ($scope, $rootScope, ApiService, $timeout) {
    
    $scope.list = [];
    $scope.selected = false;
    $scope.search = '';
    $scope.focusInput = true;

    $scope.reset = function() {
        $scope.list = [];
        $scope.selected = false;
        $scope.search = '';
        $scope.focusInput = true;
    }
    
    $rootScope.$on('auth.change', function(){
        $scope.reset();
    })

    $scope.find = function ( str ) {
        ApiService.findCuenta(str).success(function (data, status) {
            $scope.list = data;
        })
    }

    $scope.selectElm = function( item ) {
        $scope.selected = item;
        //$scope.search = item.Cuenta ;
        $rootScope.mode.search = false;
        $rootScope.mode.display = true;
        $scope.focusInput = false;
        ApiService.setCuenta(item.Cuenta).success(function (data, status) {
            $rootScope.auth._current = data;
            $rootScope.$broadcast('app.ready');
        })
    }

    $scope.keydown = function( event ) {
        $scope.selected=false;
        if( event.keyCode == 27 ) {
            $scope.list = [];
            $rootScope.changeMode('display');
        }
        if( event.keyCode == 9 ) {
            $('.searchResults').focus();
            event.preventDefault();
        }
    }

    $scope.selectByEnter = function( event, item) {
        if( event.keyCode == 13 ) {
            $scope.selectElm(item)
        }
    }

    $scope.editMode = function() {
        if( $rootScope.auth._type == 'vendedor' ) {
            $rootScope.changeMode('search');
            $scope.focusInput = true;
        }
        //test
    }

    $scope.$watch('search', function(str){
        if( str.length > 2 )
            $scope.find(str);
        else 
            $scope.list = []
    })


})


appControllers.controller('tabaCtrl', function ($scope, $rootScope, AuthenticationService, UserService, $location, shortcuts){

    $scope.taba = $scope.taba || {};
    $scope.taba.menu = [];

    var menu = [
       // scope.taba.menu = [
        {
            url : 'realizar-pedidos',
            title: 'Nuevo Pedido',
            perms: 2,
            icon: 'file text outline' 
        },
        {
            url: 'ver-pedidos',
            title: 'Pedidos realizados',
            perms : 2,
            icon: 'archive'
        },
        {
            url : 'disponibilidad',
            title : 'Disponibilidad',
            perms: 3,
            icon: 'cubes'
        },
        {
            url: 'archivos',
            title: 'Descargas',
            perms: 3,
            icon: 'cloud download'
        },
        {
            url : 'cuenta-corriente',
            title: 'Cuenta Corriente',
            perms: 1,
            icon: 'money'
        },
        {
            url : 'personalizar-codigos',
            title: 'Código Cliente',
            perms: 2,
            icon: 'barcode'
        },
        {
            url : 'logout',
            title: 'Salir',
            perms: 0,
            align: 'right',
            icon: 'sign out',
            action: 'ng-click="userLogout()"'
        }
    ];

    $rootScope.$on('apprun', function(){
    })

    $rootScope.$on('app.ready', function(){
        $rootScope.$broadcast('taba.menu');
    })

    $rootScope.$on('taba.menu', function() {
        var redirect;
        $scope.taba.menu = [];
        if( $rootScope.auth.logged ) {
            angular.forEach(menu, function(item){
                if( $rootScope.auth._perms >= item.perms  ) {
                    if( ( ! $rootScope.auth._current  && item.perms == 0 ) || $rootScope.auth._current ) {
                        if( typeof redirect == 'undefined' ) {
                            redirect = item.url;
                        }
                        $scope.taba.menu.push(item);
                    }
                }
            })

            if( $rootScope.auth && $rootScope.auth._current ) {
                $rootScope.changeMode('display');
            }

        }
    })

    $rootScope.$on('auth.change', function(){
        if( AuthenticationService.isAuthenticated ) {
            UserService.me(function (data){
                $rootScope.auth = data;
                $rootScope.auth.logged = true;
                $rootScope.$broadcast('app.ready');
                
            }, function (err) {
                $rootScope.$broadcast('app.ready');
            });
        } else {
            $location.path("/login");
        }
    })

    
})
appDirectives.directive('sidebarBtn', function ($rootScope){
    return {
        restrict: 'AE',
        template: '<i class="icon list layout"></i> Menu',
        link : function( scope, elm, attr ) {
            var transition = "slide out";

            scope.$on('isMobile',function(){
                $('#m_menu').removeClass( transition );
                $('#m_menu').addClass("top");;
                $('#m_menu').addClass("labeled icon");
                $('#m_menu').sidebar('setting', {
                  dimPage          : false,
                  transition       : 'push',
                  mobileTransition : 'push'
                })
            })

            scope.$on('noMobile',function(){
               $('#m_menu').removeClass("top push");
               $('#m_menu').removeClass("labeled icon");
                
               $('#m_menu').sidebar('setting', {
                  dimPage          : false,
                  transition       : transition
                })
            })

            angular.element(elm).bind('click',function(e){
                $('#m_menu').sidebar('toggle');
            })
        }
    }
    
})

appDirectives.directive('focusMe', function($timeout) {
  return {
    scope: { trigger: '=focusMe' },
    link: function(scope, element) {
      scope.$watch('trigger', function(value) {
        if(value === true) { 
            element[0].focus();
            scope.trigger = false;
        }
      });
    }
  };
});

appDirectives.directive('autofocusWhen', function ($timeout) {
    return {
        link: function(scope, element, attrs) {
            scope.$watch(attrs.autofocusWhen, function(newValue){
                if ( newValue ) {
                    $timeout(function(){
                        element.focus().select();
                    });
                }
            });
        }
     };
});

appDirectives.directive('tabaMenu', function( $rootScope, UserService, $compile ){

    return {
        restrict: 'A', // Atributo o Elemento ( <elm taba-menu> || <taba-menu> )
        template:     ' '
                    + '  <div class="ui secondary pointing menu" id="menu"> '
                   
                    + '      <span ng-repeat="item in taba.menu"> '
                    + '      <a href="#{{item.url}}" class="item {{item.align}}"> '

                    + '             <i class="{{item.icon}} icon"></i>{{item.title}} '

                    + '      </a> </span>'

                    + '  </div> '
                    + ' '  
                    // + '<nav class="ui very wide sidebar menu vertical left slide out" id="m_menu">' 
                    // + '      <span ng-repeat="item in taba.menu"> '
                    // + '      <a href="#{{item.url}}" class="item {{item.align}}" {{item.action}}> '

                    // + '             <i class="{{item.icon}} icon"></i>{{item.title}} - {{item.action}}'

                    // + '      </a> </span>'                    
                    // + '</nav> '  
                //    + ' <div id="m_btn" sidebar-btn> '
                //    + ' </div>'
                    ,

        link: function (scope, elm, attrs ) {
            
        }
    }
})




appDirectives.directive('resizable', function ($window, $rootScope){
    return function ($scope) {
        return angular.element($window).bind('resize', function() {
          var width = $window.innerWidth;
          if( width < 500 ) {
            $rootScope.$broadcast('isMobile');
          } else {
            $rootScope.$broadcast('notMobile');
          }
          return;
        }).trigger('resize');
    };
})

appDirectives.directive('typeahead', function($timeout,$http, ApiService) {
  return {
    restrict: 'AEC',
    scope: {
      title: '@',
      retkey: '@',
      displaykey:'@',
      modeldisplay:'=',
      subtitle: '@',
      modelret: '='
    },

    link: function(scope, elem, attrs) {
        scope.current = 0;
        scope.selected = false; 

      scope.da  = function(){
          scope.ajaxClass = 'loadImage';
          var txt = scope.modeldisplay
          ApiService.findCuenta(txt).success(function(data, status){
                scope.TypeAheadData = data;
                scope.ajaxClass = '';
          }) 

      }

      scope.handleSelection = function(key,val) {
        scope.modelret = key;
        scope.modeldisplay = val;
        scope.current = 0;
        scope.selected = true;
        scope.TypeAheadData = '';
      }

      scope.isCurrent = function(index) {
        return scope.current == index;
      }

      scope.setCurrent = function(index) {
        scope.current = index;
      }

    },
    template: 
        '<div class="ui icon input">'
            +'<input type="text" ng-model="modeldisplay" ng-keyup="da(modeldisplay)"  ng-keyup="da(modeldisplay)"  ng-keydown="selected=false" ng-class="ajaxClass" /> '
        +'</div>'
        +'<div class="list-group table-condensed overlap" ng-hide="!modeldisplay.length || selected" style="width:100%">'
            +'<a class="list-group-item noTopBottomPad" ng-repeat="item in TypeAheadData|filter:model  track by $index" '+
                       'ng-click="handleSelection(item[retkey],item[displaykey])" style="cursor:pointer" '+
                       'ng-class="{active:isCurrent($index)}" '+
                       'ng-mouseenter="setCurrent($index)">'+
                         ' {{item[title]}}<br />'+
                         '<i>{{item[subtitle]}} </i>'+
                    '</a> '+
        '</div>'
  };
});

appDirectives.directive('onReadFile', function ( $parse ) {
  return {
    restrict : 'A',
    scope : false,
    link : function ( scope, element, attrs ) {
      var fn = $parse(attrs.onReadFile);

      element.on('change', function(onChangeEvent) {
          var reader = new FileReader();

          reader.onload = function ( onLoadEvent ) {
            if( onLoadEvent.target.result != '' ) {
              scope.$apply( function() {
                element.val('');
                fn( scope, { $fileContent: onLoadEvent.target.result } );
              });
            }
          };

          reader.readAsBinaryString((onChangeEvent.srcElement || onChangeEvent.target).files[0]);
      })
    }
  }
})
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


(function(){
    'use strict';
    angular.module('taba.shortcuts',[]).provider('shortcuts',function(){
        this.$get = function ( $rootElement, $rootScope, $compile, $window, $document ) {
            
            Mousetrap.stopCallback = function( event, element ) {
                if( (' ' + element.className + ' ' ).indexOf(' mousetrap ') > -1 ) {
                    return false;
                }

                return ( element.contentEditable && element.contentEditable == 'true' );
            };

            function symbolize (combo) {
                var map = {
                  command   : '⌘',
                  shift     : '⇧',
                  left      : '←',
                  right     : '→',
                  up        : '↑',
                  down      : '↓',
                  'return'  : '↩',
                  backspace : '⌫'
                }; 

                combo = combo.split('+');

                for (var i = 0; i < combo.length; i++) {
                  // try to resolve command / ctrl based on OS:
                  if (combo[i] === 'mod') {
                    if ($window.navigator && $window.navigator.platform.indexOf('Mac') >=0 ) {
                      combo[i] = 'command';
                    } else {
                      combo[i] = 'ctrl';
                    }
                  }

                  combo[i] = map[combo[i]] || combo[i];
                }

                return combo.join(' + ');
            }

            function Shortcut (combo, description, callback, action, allowIn, persistent ) {
                
                this.combo = combo instanceof Array ? combo : [combo];
                this.description = description;
                this.callback = callback;
                this.action = action;
                this.allowIn = allowIn;
                this.persistent = persistent;
            }

            Shortcut.prototype.format = function() {
                var combo = this.combo[0];
                var sequence = combo.split(/[\s]/);
                for ( var i = 0; i < sequence.length; i++ ) {
                    sequence[i] = symbolize(sequence[i]);
                }
                return sequence;
            }

            // Nuevo Scope
            var scope = $rootScope.$new();

            scope.shortcuts = [];

            var boundScopes = [];

            $rootScope.$on('$routeChangeSuccess', function (event, route) {
                purgeShortcuts();

                if( route && route.shortcuts ) {
                    angular.forEach( route.shortcuts, function (shortcut) {
                        var callback = shortcut[2];
                        if( typeof(callback) === 'string' || callback instanceof String ) {
                            shortcut[2] = [callback, route];
                        }

                        // Definir como no persistente ya que es un shortcut asignado a una ruta
                        shortcut[5] = false;
                        _add.apply(this, shortcut);
                    })
                }
            });

            function purgeShortcuts() {
                var i = scope.shortcuts.length;
                while( i-- ) {
                    var shortcut = scope.shortcuts[i];
                    if( shortcut && !shortcut.persistent ) {
                        _del(shortcut);
                    }
                }
            }


            function _add (combo, description, callback, action, allowIn, persistent) {
                var _callback;

                var preventIn = ['INPUT', 'SELECT', 'TEXTAREA'];

                // Si se define como objeto setear los valores correspondientes
                var objType = Object.prototype.toString.call(combo);

                if( objType === '[object Object]') {
                    description = combo.description;
                    callback = combo.callback;
                    action = combo.action;
                    persistent = combo.persistent;
                    allowIn = combo.allowIn;
                    combo = combo.combo;
                }

                if (description instanceof Function) {
                  action = callback;
                  callback = description;
                  description = '$$undefined$$';
                } else if (angular.isUndefined(description)) {
                  description = '$$undefined$$';
                }

                if (persistent === undefined) {
                  persistent = true;
                }

                if (typeof callback === 'function' ) {
                    // guardar el callback original
                    _callback = callback;

                    // asegurarse que allowIn sea un array
                    if( ! (allowIn instanceof Array ) ) {
                        allowIn = [];
                    }

                    // Remover todo lo que este en preventIn que este dentro
                    // de allowIn
                    var index;
                    for ( var i = 0; i < allowIn.length; i++ ) {
                        allowIn[i]  = allowIn[i].toUpperCase();
                        index = preventIn.indexOf(allowIn[i]);
                        if( index !== -1 ) {
                            preventIn.splice(index, 1);
                        }
                    }

                    // wraper para el callback
                    callback = function (event) {
                        var shouldExecute = true;
                        var target = event.target || event.srcElement;
                        var nodeName = target.nodeName.toUpperCase();

                        if( (' ' + target.className + ' ').indexOf(' mousetrap ') > -1 ) {
                            shouldExecute = true;
                        } else {
                            for( var i = 0; i < preventIn.length; i++ ) {
                                if( preventIn[i] === nodeName ) {
                                    shouldExecute = false;
                                    break;
                                }
                            }
                        }

                        if( shouldExecute ) {
                            wrapApply( _callback.apply(this, arguments) );
                        }
                    }; 

                }

                if( typeof(action) === 'string') {
                    Mousetrap.bind(combo, wrapApply(callback), action);
                } else {
                    Mousetrap.bind(combo, wrapApply(callback));
                }

                var shortcut = new Shortcut (combo, description, callback, action, allowIn, persistent);
                scope.shortcuts.push(shortcut);
                return shortcut;
            }

            function _del (shortcut) {
                var combo = ( shortcut instanceof Shortcut ) ? shortcut.combo : shortcut;

                Mousetrap.unbind(combo);

                if( angular.isArray(combo) ) {
                    var retStatus = true;
                    var i = combo.length;
                    while( i-- ) {
                        retStatus = _del(combo[i]) && retStatus;
                    }
                    return retStatus;
                } else {
                    var index = scope.shortcuts.indexOf(_get(combo));

                    if( index > -1 ) {
                        if( scope.shortcuts[index].combo.length > 1 ) {
                            scope.shortcuts[index].combo.splice( scope.shortcuts[index].combo.indexOf(combo), 1);
                        } else {
                            scope.shortcuts.splice(index, 1);
                        }
                        return true;
                    }
                }

                return false;
            }

            function _get ( combo ) {
                var shortcut;

                for (var i = 0; i < scope.shortcuts.length; i++) {
                    var shortcut = scope.shortcuts[i];
                    
                    if( shortcut.combo.indexOf( combo) > -1 ) {
                        return shortcut;
                    }
                }

                return false;
            }


            function bindTo ( scope ) {
                
                if( ! (scope.$id in boundScopes ) ) {
                    boundScopes[scope.$id] = [];

                    scope.$on('$destroy', function(){
                        var i = boundScopes[scope.$id].length;
                        while( i-- ) {
                            _del(boundScopes[scope.$id].pop())
                        }
                    });
                }

                return {
                    add : function ( args ) {
                        var shortcut;

                        if( arguments.length > 1 ) {
                            shortcut = _add.apply(this, arguments);
                        } else {
                            shortcut = _add(args);
                        }

                        boundScopes[scope.$id].push(shortcut);

                        return this;
                    }
                }
            }

            function unbind( scope ) {
                if( (scope.$id in boundScopes ) ) {
                    var i = boundScopes[scope.$id].length;
                        while( i-- ) {
                            _del(boundScopes[scope.$id].pop())
                        }
                }
            }

            function wrapApply ( callback ) {
                return function (event, combo) {
                    if( callback instanceof Array ) {
                        var funcString = callback[0];
                        var route = callback[1];
                        callback = function( event ) {
                            route.scope.$eval(funcString);
                        }
                    }

                    $rootScope.$apply( function() {
                        callback( event, _get(combo) );
                    });
                }
            }

            var publicApi = {
                add : _add,
                del : _del,
                get : _get,
                bindTo : bindTo,
                purge : purgeShortcuts
            }

            return publicApi;
            
        }
    })
    .directive('shortcut', function( shortcuts ) {
        return {
            restrict : 'A',
            link : function( scope, el, attrs ) {
                var key, allowIn;

                angular.forEach(scope.$eval(attrs.shortcut), function (func, shortcut) {
                     allowIn = typeof attrs.shortcutAllowIn === "string" ? attrs.shortcutAllowIn.split(/[\s,]+/) : [];

                     key = shortcut;

                     shortcuts.add({
                        combo : shortcut,
                        description: attrs.shortcutDescription,
                        callback: func,
                        action : attrs.shortcutAction,
                        allowIn: allowIn
                     })
                });

                el.bind('$destroy', function() {
                    shortcuts.del(key);
                }); 
            }
        }
    })
    .run(function(shortcuts) {
    });

})();