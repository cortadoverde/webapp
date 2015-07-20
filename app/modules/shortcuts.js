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