define([

   'module',
   'ngModule',
   'jquery',
   'ClientNodeContext',
   'ApplicationContext',
   'swLoggerFactory'

   ], function(

   module,
   ngModule,
   $,
   ClientNodeContext,
   ApplicationContext,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.run([ 'swScrollFactory', 'swApplicationScroll', 'swFeatureDetector', '$window',
       function(  swScrollFactory  ,  swApplicationScroll ,  swFeatureDetector ,  $window )
   {
      logger.trace('run');

      if (ApplicationContext.application === 'searcher') {
         return;
      }

      var options = {
         baron       : swFeatureDetector.isDesktop(),
         translate   : true, //ClientNodeContext.native,
         preventParentScroll  : !ClientNodeContext.native && !swFeatureDetector.isDesktop(),

         animate : false,
         scrollEdgeWidth   : 100,    // pixels
         useGentle         : !swFeatureDetector.isDesktop(),
         gentleDebounceTime: 500,
         useInternalScrolling   : false  // if false we will scroll only by edge
      };

      swScrollFactory._configure({options: options});
      swApplicationScroll.changeScrollType('STANDARD', $($window), {preventParentScroll: false});
   }]);
});
