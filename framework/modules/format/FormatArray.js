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
    * array - {Array | Object}
    * filterName - {String} filter which should be applied to every element of array
    *
    * Applies filter specified by filterName to every element of the array.
    * If array is not a js Array, returns filter applied to this single element.
    *
    * usage:
    *    var items = [{id: 'a'}, {id: 'b'}, {id: 'c'}, {id: 'd'}];
    *    ...
    *    {{items | swFormatArray:'swFormatId' | swFormatJoin:', '}}
    *
    * will be formatted as: 'a, b, c, d'
    */
   ngModule.filter('swFormatArray', ['$filter', function($filter)
   {
      return function(array, filterName)
      {
         var res;
         var filter = $filter(filterName);
         
         if (_.isArray(array))
         {
            res = _.map(array, function(x)
            {
               return filter(x);
            });
         }
         else
         {
            res = filter(array);
         }
         
         return res;
      };
   }]);

});
