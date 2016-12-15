define([

   'swComponentFactory',
   'module',
   'less!./Popup'

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
