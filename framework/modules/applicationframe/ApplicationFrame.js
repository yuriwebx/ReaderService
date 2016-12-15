define([
   'swComponentFactory',
   'module',
   'text!./ApplicationFrame.html',
   'less!./ApplicationFrame'

   ], function(

   swComponentFactory,
   module,
   template

   ){

   'use strict';

   swComponentFactory.create({
      module      : module,
      template    : template,
      controller  : [
          function()
      {

      }]
   });
});
