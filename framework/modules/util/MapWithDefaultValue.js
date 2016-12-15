define( [ 'module', 'ngModule', 'swLoggerFactory' ],
function(  module,   ngModule,   swLoggerFactory  )
{
   'use strict';
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.factory('swMapWithDefaultValue', [function()
   {
      logger.trace('register');

      function Map(object)
      {
         var map = object||{};

         this.get = function(key)
         {
            var result = map[key];
            if ( !result )
            {
               result = map.DEFAULT;
               if ( !result )
               {
                  result = map['default'];
               }
            }
            return result;
         };
      }

      // public static
      Map.createInstance = function(object)
      {
         return new Map(object);
      };
      return Map;
   }]);

});
