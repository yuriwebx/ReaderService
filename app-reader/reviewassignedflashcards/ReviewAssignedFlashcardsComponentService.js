define([
   'module',
   'swServiceFactory'
], function(module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         function() {
            var listeners = [];

            this.addOnFlashCardsCloseListener = function(_listener) {
               listeners.push(_listener);
            };

            this.removeOnFlashCardsCloseListener = function(listener) {
               for (var i = 0; i < listeners.length; ++i) {
                  if (listeners[i] === listener) {
                     listeners.splice(i, 1);
                     break;
                  }
               }
            };

            this.onFlashCardsClose = function(params) {
               if (!params) {
                  return;
               }
               if (!params._id && params.fileHash) {
                  params._id = params.fileHash;
               }
               for (var i = 0; i < listeners.length; ++i) {
                  listeners[i](params);
               }
            };
         }
      ]
   });
});