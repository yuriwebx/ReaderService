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
    * forgivingly formats obj to obj.id
    * useful to use with other formatters
    * example: {{items | swFormatArray:'swFormatId' | swFormatJoin:', '}}
    */
   ngModule.filter('swFormatId', [function()
   {
      return function(obj)
      {
         return (obj && obj.id) ? obj.id : obj;
      };
   }]);
   
});
