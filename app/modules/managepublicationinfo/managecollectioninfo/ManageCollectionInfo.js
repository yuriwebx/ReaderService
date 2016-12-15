define([
   'module',
   'swComponentFactory',
   'text!./ManageCollectionInfo.html',
   'less!./ManageCollectionInfo'
],
function ( module, swComponentFactory, template ) {
   'use strict';
   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         publication: '='
      },
      controller: [
         function () {

         }]
   });
});
