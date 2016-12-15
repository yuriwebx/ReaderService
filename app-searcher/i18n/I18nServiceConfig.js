define([

   'module',
   'ngModule',
   'swLoggerFactory',
   'Context'

   ], function(

   module,
   ngModule,
   swLoggerFactory,
   Context

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.run([
                 
      'swI18nService',
      
   function(
         
      swI18nService
      
   )
   {
      logger.trace('run');
      
      /////////////////////////////////////////////////////////////////////////
      
      swI18nService._getResource = function(key)
      {
         return Context.languageResources[key] || key;
      };
      
      /////////////////////////////////////////////////////////////////////////
      
   }]);
   
});
