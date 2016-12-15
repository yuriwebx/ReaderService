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
   
   ngModule.filter('swFormatDttmDate', ['swDateService', 'swI18nService',
                               function( swDateService,   swI18nService)
   {
      return function(obj)
      {
         return obj ? swDateService.formatDttm(obj, swI18nService.getDateMask()) : '';
      };
   }]);
   
});
