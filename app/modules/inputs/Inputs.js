define([

   'swComponentFactory',
   'module',
   'less!./Inputs'

   ], function(

   swComponentFactory,
   module

   ){

   'use strict';
   
   swComponentFactory.create({
      module : module,
      submachine: true,
      controller: [function(){}]
   });

});
