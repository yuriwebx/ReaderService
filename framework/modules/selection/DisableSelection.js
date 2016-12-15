define([

   'module',
   'jquery',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   $,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.run(['swFeatureDetector', function(swFeatureDetector)
   {
      logger.trace('run');

      // http://stackoverflow.com/questions/1794220/how-to-disable-mobilesafari-auto-selection
      
      if ( swFeatureDetector.isTouchInput() )
      {
         var $body = $('body');
         $body[0].onselectstart = function() { return false; };
         $body[0].unselectable = 'on';
         $body.css('-moz-user-select', 'none');
         $body.css('-webkit-user-select', 'none');
      }
      
   }]);
      
});
