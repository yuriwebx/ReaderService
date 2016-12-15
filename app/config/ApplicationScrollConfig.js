define([

   'module',
   'underscore',
   'ApplicationContext',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   _,
   ApplicationContext,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.run(['$q', '$rootScope', 'swApplicationScroll', 'swLayoutManager',
       function(  $q,   $rootScope,   swApplicationScroll,   swLayoutManager )
   {
      logger.trace('run');

      if (ApplicationContext.application === 'searcher') {
         return;
      }

      swApplicationScroll.addScrollTopListener(function()
      {
         // Ensure angular digest when scrollTop is changed top/non-top.
         // Note that some changes are actually applied to DOM by swLayoutManager
         // (which "debounce"s events). So we resolve the promise next tick after
         // the nearest digest event got from swLayoutManager.

         return $q(function(resolve)
         {
            $rootScope.$evalAsync(function()
            {
               swLayoutManager.register({
                  id    : module.id,
                  layout: function(context)
                  {
                     if ( context.events.digest )
                     {
                        _.defer(resolve);
                        swLayoutManager.unregister(module.id);
                     }
                  }
               });
            });
         });

      });
   }]);
});
