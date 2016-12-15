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
    * If input is an array, creates
    *   a copy of this array with reverted elements order.
    * else returns input back.
    */
   ngModule.filter('swFormatRevert', [function()
   {
      return function(obj)
      {
         var res = obj;
         
         if(obj && _.isArray(obj) && obj.length > 0)
         {
            res = [];
            for(var i = obj.length - 1; i >= 0; i--)
            {
               res.push(obj[i]);
            }
         }
         
         return res;
      };
   }]);

});
