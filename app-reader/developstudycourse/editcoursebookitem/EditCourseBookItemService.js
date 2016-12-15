define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [function () {
         var clear,
            paragraphUpdate;

         this.setClearSelection = function (clearFun) {
            clear = clearFun;
         };

         this.clearSelection = function () {
            clear();
         };

         this.onSelectionUpdate = function (data) {
            paragraphUpdate(data);
         };

         this.setSelectionUpdate = function (paragraphUpdateFun) {
            paragraphUpdate = paragraphUpdateFun;
         };
      }]
   });
});
