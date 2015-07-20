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