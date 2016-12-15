define([

   'module',
   'angular',
   'ngModule',
   'swLoggerFactory',
   'text!./LongRunningSpinner.html',
   'text!./LongRunningInputBlocker.html',
   'less!./LongRunning.less'

   ], function(

   module,
   ng,
   ngModule,
   swLoggerFactory,
   spinnerTemplate,
   inputBlockerTemplate
   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   /////////////////////////////////////////////////////////////////
   
   ngModule.run([
      'swLongRunningOperation',
      'swLongRunningService',
   function(
      swLongRunningOperation,
      swLongRunningService
   )
   {
      logger.trace('run');
      swLongRunningOperation.addListener(swLongRunningService, 'swLongRunningService');
   }]);
   
   /////////////////////////////////////////////////////////////////
   
   ngModule.service('swLongRunningService', [
                                             
      '$window',
      '$timeout',
      'swUserInputBlockerRegistry',
      
   function(
         
      $window,
      $timeout,
      swUserInputBlockerRegistry
      
   )
   {
      logger.trace('register');
      
      /////////////////////////////////////////////////////////////////

      // swLongRunningOperationListener implementation
      this.start = function()
      {
         this.block();
      };
      this.end = function()
      {
         this.unblock();
      };
      
      /////////////////////////////////////////////////////////////////
      
      swUserInputBlockerRegistry.register('swLongRunningService', this);
      this.isUserInputBlocked = function()
      {
         return this.isBlocked();
      };
      
      /////////////////////////////////////////////////////////////////
      
      var DELAY_BEFORE_SPINNER = 2000;
      var DELAY_BEFORE_UNBLOCK =  150;
      
      var body = ng.element('body');
      var spinner = ng.element(spinnerTemplate);
      var inputBlocker = ng.element(inputBlockerTemplate);

      var spinnerTimeout;
      var blocksCounter = 0;
      
      inputBlocker[0].addEventListener('click', function(event)
      {
         logger.trace('click stop');
         event.stopImmediatePropagation();
         event.stopPropagation();
      }, true);
      
      $window.document.addEventListener('keydown', function(event)
      {
         if ( blocksCounter > 0 )
         {
            logger.trace('key blocked', event.keyCode);
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
         }
      }, true);
      
      this.block = function()
      {
         logger.trace('block', blocksCounter);
         if ( blocksCounter === 0 )
         {
            blockInput();
            spinnerTimeout = $timeout(showSpinner, DELAY_BEFORE_SPINNER, false);
         }
         blocksCounter++;
      };

      this.unblock = function()
      {
         // '$timeout' below is needed for the following purposes:
         // - postpone 'unblock()' until angular digest and DOM update is performed for
         //   the current execution context ->  then user cannot produce any event
         //   until view is fully updated
         // - combine consecutive 'block()'s if time between them is less than DELAY_BEFORE_UNBLOCK
         $timeout(function()
         {
            blocksCounter--;
            logger.trace('unblock', blocksCounter);
            if ( blocksCounter === 0 )
            {
               $timeout.cancel(spinnerTimeout);
               hideSpinner();
               unblockInput();
            }
            else if ( blocksCounter < 0 )
            {
               throw new Error('incorrect block/unblock sequence: blocksCounter=' + blocksCounter);
            }
         },
         DELAY_BEFORE_UNBLOCK, false);
      };

      this.isBlocked = function()
      {
         return blocksCounter > 0;
      };
      
      function blockInput()
      {
         body.append(inputBlocker);
      }
      
      function unblockInput()
      {
         inputBlocker.remove();
      }

      function showSpinner()
      {
         body.append(spinner);
      }

      function hideSpinner()
      {
         spinner.remove();
      }

   }]);
});