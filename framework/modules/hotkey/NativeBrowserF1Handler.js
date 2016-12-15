/*global window: false */

define([

   'module',
   'swServiceFactory'

   ], function(

   module,
   swServiceFactory

   ){

   'use strict';

   swServiceFactory.create({
      module: module,
      service: [function()
      {

         // http://stackoverflow.com/questions/3405412/internet-explorer-or-any-browser-f1-keypress-displays-your-own-help

         var cancelKeypress;
         
         this.disable = function()
         {
            this.logger.trace('disable');
            
            // Internet Explorer
            if ( 'onhelp' in window )
            {
               window.onhelp = function()
               {
                  return false;
               };
            }

            // Others
            else
            {
               window.document.onkeydown = function(event)
               {
                  cancelKeypress = event.keyCode === 112; // F1
                  if ( cancelKeypress )
                  {
                     return false;
                  }
               };

               // Additional step required for Opera
               window.document.onkeypress = function()
               {
                  if ( cancelKeypress )
                  {
                     return false;
                  }
               };
            }
         };

      }]
   });

});
