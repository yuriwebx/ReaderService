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
   
   /**
    * formats boolean input into string specified by
    * swI18nService BooleanYesFormat/BooleanNoFormat ('Yes'/'No')
    */
   ngModule.filter('swFormatBooleanToYesNo', ['swI18nService', function(swI18nService)
   {
      var yesFormat = swI18nService.getResource('BooleanYesFormat');
      var  noFormat = swI18nService.getResource('BooleanNoFormat');
      
      return function(obj)
      {
         return obj ? yesFormat : noFormat;
      };
   }]);

});
