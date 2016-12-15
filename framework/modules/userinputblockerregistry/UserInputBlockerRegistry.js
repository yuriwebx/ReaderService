define(
   ['module', 'underscore', 'ngModule', 'swLoggerFactory'],
function
   ( module,   _,            ngModule,   swLoggerFactory )
{
   'use strict';
      
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.service('swUserInputBlockerRegistry', [function()
   {
      logger.trace('register');
      
      var registry = {};

      this.register = function(blockerName, blocker)
      {
         logger.trace('register', blockerName);
         registry[blockerName] = blocker;
      };
         
      this.isUserInputBlocked = function()
      {
         return _.any(registry, function(blocker)
         {
            if ( _.isFunction(blocker.isUserInputBlocked) && blocker.isUserInputBlocked() )
            {
               return true;
            }
         });
      };
      
      this.isModal = function()
      {
         return _.any(registry, function(blocker)
         {
            if ( _.isFunction(blocker.isModal) && blocker.isModal() )
            {
               return true;
            }
         });
      };
   
      this.isElementBlocked = function(element)
      {
         if ( this.isUserInputBlocked() )
         {
            return true;
         }
         
         return _.any(registry, function(blocker)
         {
            if ( _.isFunction(blocker.isElementBlocked) && blocker.isElementBlocked(element) )
            {
               return true;
            }
         });
      };
   
      this.isHistoryBlocked = function()
      {
         return this.isUserInputBlocked() || this.isModal();
      };
      
   }]);

});
