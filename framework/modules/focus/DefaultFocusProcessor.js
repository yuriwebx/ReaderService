define([

   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   _,
   ngModule,
   swLoggerFactory

   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.run([
      '$rootScope',
      'swFocusManagerService',

      function(
         $rootScope,
         swFocusManagerService
      )
   {
      logger.trace('run');

      /*
       * Monitor UCs activity.
       * If any UCs was started ('$start' event was encountered) 
       * then wait for idle state (_.debounce), then
       * - request default focus processing on root focus manager.
       */
      
      $rootScope.$on('SubmachineStateChanged', function(e, context)
      {
         /*jshint unused:true */

         if ( context.currState === '$start' )
         {
            // TODO skip if in popup
            _setDefaultFocus();
         }
      });

      var _setDefaultFocus = _.debounce(function()
      {
         logger.debug('setDefaultFocus');


         // todo rem this code from app/config/DefaultFocusProcessor after merge framework from swp
         // swApplicationScroll.resetScroll();
         swFocusManagerService.requestDefaultFocus();
      }, 100);

   }]);
   
});
