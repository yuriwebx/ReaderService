define([

   'module',
   'ngModule',
   'swLoggerFactory',
   'underscore'

   ], function(

   module,
   ngModule,
   swLoggerFactory,
   _
   
   ){
   
   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   /**
    * obj - {Array | Object} - input data which should be formatted
    * separator - {String} - separator for array elements
    *
    * Applies join function to input array with given separator.
    *
    * usage:
    *    var items = [{id: 'a'}, {id: 'b'}, {id: 'c'}, {id: 'd'}];
    *    ...
    *    {{items | swFormatArray:'swFormatId' | swFormatJoin:', '}}
    *
    * will be formatted as: 'a, b, c, d'
    */
   ngModule.filter('swFormatJoin', [function()
   {
      return function(obj, separator)
      {
         var res = obj;
         
         if(obj && _.isArray(obj))
         {
            res = obj.join(separator);
         }
         
         return res;
      };
   }]);

});
