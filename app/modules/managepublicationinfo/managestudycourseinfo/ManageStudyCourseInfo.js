define([
   'module',
   'swComponentFactory',
   'text!./ManageStudyCourseInfo.html',
   'less!./ManageStudyCourseInfo'
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
