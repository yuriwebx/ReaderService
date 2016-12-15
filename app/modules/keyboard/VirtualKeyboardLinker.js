define([
   'underscore',
   'ngModule'
],
function ( _, ngModule ) {
   'use strict';

   var DIRECTIVE_NAME = 'swVirtualKeyboardLinker';

   ngModule.directive( DIRECTIVE_NAME, ['swKeyboardService', swVirtualKeyboardLinkerDirective]);

   function swVirtualKeyboardLinkerDirective(swKeyboardService)
   {
      return {
         restrict: 'A',
         link: function(/* jshint unused:true */ $scope, element, attr )
         {
            var data = $scope.$eval(attr[DIRECTIVE_NAME]) || {};

            _.defaults(data, {
               keyboardActive  : false
            });

            if (!data.keyboardActive) {
               return;
            }

            _.defer(_process);
            element.on('$destroy', _unprocess);

            function _process() {
               swKeyboardService.process(element);
            }

            function _unprocess() {
               swKeyboardService.unprocess(element);
            }
         }
      };
   }
});
