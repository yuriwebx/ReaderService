define([
   'module',
   'swComponentFactory',
   'text!./LoginResults.html',
   'less!./LoginResults',
   'less!./LoginResults_Sepia',
   'less!./LoginResults_Night'
], function(module, swComponentFactory, template){
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         message: '@'
      },
      controller: [
         function(){


      }]
   });
});