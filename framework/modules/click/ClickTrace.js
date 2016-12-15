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
   
   ngModule.directive('swClickTrace', ['swUtil', function(swUtil)
   {
      logger.trace('register');
   
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            /*jshint unused:false */
            
            var t1, t2;
            
            element.on('touchstart', function(event)
            {
               t1 = swUtil.now();
               logger.trace(event.type);
            });
            
            element.on('touchend', function(event)
            {
               t2 = swUtil.now();
               logger.trace(event.type, t2 - t1);
            });
            
            element.on('mousedown mouseup', function(event)
            {
               logger.trace(event.type);
            });
            
            element.on('click', function(event)
            {
               logger.trace(event.type, t2 ? swUtil.now() - t2 : '');
            });
            
         }
      };
   }]);

});
