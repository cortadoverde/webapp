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