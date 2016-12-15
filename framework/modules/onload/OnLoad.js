/**

Usage:
   <iframe sw-on-load="expr"/>
 
*/
define([

   'module',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   var dirName = 'swOnLoad';
   
   ngModule.directive(dirName, ['$parse', function($parse)
   {
      logger.trace('register');

      return {
         restrict: 'A',
         compile: function(element, attr)
         {
            /*jshint unused:true */
            
            var expr = attr[dirName];
            var fn = $parse(expr);

            return function(scope, element)
            {
               element.on('load', function(event)
               {
                  scope.$apply(function()
                  {
                     logger.trace(expr);
                     fn(scope, {$event: event});
                  });
               });
            };
         }
      };
   }]);

});