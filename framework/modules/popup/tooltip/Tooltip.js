define([

   'module',
   'swLoggerFactory',
   'ngModule'

   ], function(

   module,
   swLoggerFactory,
   ngModule

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swTooltip', ['swTooltipService', function(swTooltipService)
   {
      logger.trace('register swTooltip');
      
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            /*jshint unused:true */
            
            swTooltipService.tooltip(element, {text: attr.swTooltip});
         }
      };
   }]);

   ngModule.directive('swTooltipOptions', ['swTooltipService', function(swTooltipService)
   {
      logger.trace('register swTooltipOptions');
   
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            swTooltipService.tooltip(element, scope.$eval(attr.swTooltipOptions));
         }
      };
   }]);

});
