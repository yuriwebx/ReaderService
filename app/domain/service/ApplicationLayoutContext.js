define([
   'underscore',
   'jquery',
   'ngModule',
   'ApplicationContext'
], function(_, $, ngModule, ApplicationContext) {
   'use strict';

   ngModule.run(['$rootScope', 'swApplicationScroll', 'swSubmachine', 'swScrollFactory', '$window', ApplicationLayoutContextRunner]);

   function ApplicationLayoutContextRunner($rootScope, swApplicationScroll, swSubmachine, swScrollFactory, $window) {
      if (ApplicationContext.application === 'searcher') {
         return;
      }

      var SCROLL_TYPES  = swScrollFactory.getSupportedTypes(),
          DEFAULT_TYPE  = _.first(SCROLL_TYPES),
          currentType   = '';

      $rootScope.$on('SubmachineStateChanged', function() {
         var stack   = swSubmachine.getStack(),
             type    = '';

         stack.forEach(function(context) {
            var scope = context.scope;

            if ( _.has(scope, 'swApplicationScrollType') ) {
               if ( context.currState === '$end' ) {
                  type = DEFAULT_TYPE;
               }
               else if ( context.currState === '$start' ) {
                  type = _returnIfExistsOrFirst(SCROLL_TYPES, scope.swApplicationScrollType);
               }
            }
         });

         if (currentType !== type && type !== '') {
            currentType = type;
            _.defer(function() {
               var options = {preventParentScroll: false};
               swApplicationScroll.changeScrollType(type, $($window), options);
               _.each(stack, _.method('scope.swOnChangeApplicationScrollType'));
            });
         }
      });
   }

   function _returnIfExistsOrFirst(arr, obj) {
      if ( _.contains(arr, obj) ) {
         return obj;
      }

      return _.first(arr);
   }
});
