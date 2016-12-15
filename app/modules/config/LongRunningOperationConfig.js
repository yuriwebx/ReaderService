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
      'swLongRunningOperation',
      
   function(
         
      $rootScope,
      swLongRunningOperation
      
   )
   {
      logger.trace('run');
      
      /////////////////////////////////////////////////////////////////////////
      
      var _longRunningOperationEnd = _.noop;
      
      // start "LongRunningOperation" on any Submachine activity
      function _submachine()
      {
         logger.trace('submachine');
         if ( _longRunningOperationEnd === _.noop )
         {
            logger.debug('start');
            _longRunningOperationEnd = swLongRunningOperation.start(module.id);
         }
         
         _debounce();
      }
      
      // prolong "LongRunningOperation" (if started) on any angular digest
      function _digest()
      {
         if ( _longRunningOperationEnd !== _.noop )
         {
            logger.trace('digest');
            _debounce();
         }
      }
            
      // stop "LongRunningOperation" on idle
      var _debounce = _.debounce(function()
      {
         logger.debug('end');
         _longRunningOperationEnd();
         _longRunningOperationEnd = _.noop;
      }, 200);
      
      $rootScope.$on('SubmachineEventTriggering', _submachine);
      $rootScope.$on('SubmachineEventTriggered',  _submachine);
      $rootScope.$on('SubmachineStateChanging',   _submachine);
      $rootScope.$on('SubmachineStateChanged',    _submachine);
      $rootScope.$on('swLocationChange',          _submachine);
      $rootScope.$watch(_digest);

      /////////////////////////////////////////////////////////////////////////
      
   }]);
   
});
