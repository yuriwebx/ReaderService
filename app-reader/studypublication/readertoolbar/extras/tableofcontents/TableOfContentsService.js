define([
   'module',
   'swServiceFactory'
], function(module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : [function() {
         var listeners = [];
         
         this.addOnTOCItemClickedListener = function(_listener)
         {
            listeners.push(_listener);
         };
         
         this.removeOnTOCItemClickedListener = function(listener)
         {
            for (var i = 0; i < listeners.length; ++i)
            {
               if (listeners[i] === listener)
               {
                  listeners.splice(i, 1);
                  break;
               }
            }
         };
         
         this.onTOCItemClicked = function(params)
         {
            for (var i = 0; i < listeners.length; ++i)
            {
               listeners[i](params);
            }
         };
      }]
   });
});