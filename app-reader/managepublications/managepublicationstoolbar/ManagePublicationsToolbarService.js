define([
   'module',
   'swServiceFactory'
], function(module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
      function() {
         var showPopupFn = function(){};

         this.showPopup = function()
         {
            showPopupFn();
         };
         this.setSetShowPopupFn = function(fn)
         {
            showPopupFn = fn;
         };

      }]
   });
});
