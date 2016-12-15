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
    * forgivingly formats obj to obj.name
    * useful to use with other formatters
    * example: {{items | swFormatArray:'swFormatName' | swFormatJoin:', '}}
    */
   ngModule.filter('swFormatName', [function()
   {
      return function(obj)
      {
         return (obj && obj.name) ? obj.name : '';
      };
   }]);

});
