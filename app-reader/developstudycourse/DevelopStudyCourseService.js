define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [function () {
         var listeners = [];

         this.addEditItemListener = function(_listener) {
            listeners.push(_listener);
         };

         this.removeEditItemListener = function(listener) {
            for (var i = 0; i < listeners.length; ++i) {
               if (listeners[i] === listener) {
                  listeners.splice(i, 1);
                  break;
               }
            }
         };

         this.editItem = function(options) {
            for (var i = 0; i < listeners.length; ++i) {
               listeners[i](options);
            }
         };
      }]
   });
});