/**
 * swCustomScroll - directive for customization scroll
 */
define([

   'module',
   'ngModule',
   'swLoggerFactory'

], function(

   module,
   ngModule,
   swLoggerFactory

) {

   'use strict';

   var DIRECTIVE = 'swCustomScroll';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.directive(DIRECTIVE, [

      'swScrollFactory',

      function (
         swScrollFactory
      )
      {
         return {
            restrict: 'A',
            link: function(/*jshint unused:true */ scope, element, attr)
            {
               var data = scope.$eval(attr[DIRECTIVE]) || {};

               if (data.disabled) {
                  return;
               }

               var scroll = swScrollFactory.createScroll(data.type, element, data.options);

               element.on('$destroy', function _onElementDestroy()
               {
                  scroll.destroy();
               });
            }
         };
      }
   ]);
});
