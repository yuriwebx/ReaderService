define([

   'module',
   'ngModule',
   'hammer',
   'swLoggerFactory'
   
   ], function(

   module,
   ngModule,
   Hammer,
   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
 
 ////////////////////////////////////////////////////////////////////////////
 
   var dirName = 'swSwipe';
   
   // copy-pasted from Hammer
   var DIRECTION_NONE  =  1;
   var DIRECTION_LEFT  =  2;
   var DIRECTION_RIGHT =  4;
   var DIRECTION_UP    =  8;
   var DIRECTION_DOWN  = 16;
   
   var directionMap = {};
   directionMap[DIRECTION_NONE]  = 'none';
   directionMap[DIRECTION_LEFT]  = 'left';
   directionMap[DIRECTION_RIGHT] = 'right';
   directionMap[DIRECTION_UP]    = 'up';
   directionMap[DIRECTION_DOWN]  = 'down';
   
   ngModule.directive(dirName, ['$parse', function($parse)
   {
      logger.trace('register', dirName);
   
      return {
         restrict: 'A',
         
         link: function(scope, element, attr)
         {
            var fn = $parse(attr[dirName]);
            
            var hammerManager = new Hammer.Manager(element[0]);
            hammerManager.add(new Hammer.Swipe());
            hammerManager.on('swipe', function(event)
            {
               scope.$apply(function()
               {
                  var direction = directionMap[event.direction];
                  logger.trace('swipe', direction);
                  fn(scope, {$event: event, direction: direction});
               });
            });
         }
      };
      
   }]);
   
});
