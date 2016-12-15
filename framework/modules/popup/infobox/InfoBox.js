define([

   'module',
   'underscore',
   'swServiceFactory',
   'text!./InfoBox.html',
   'less!./InfoBox',

   ], function(

   module,
   _,
   swServiceFactory,
   content

   ){

   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['swPopup', function(swPopup)
      {

         // see comments in Popup.js
         this.show = function(opts)
         {
            var options = _.clone(opts);
            options.layout = options.layout || {};
            options.layout.margin = 25;
            options.content = options.content || content;
            options.modal = false;
            options.backdropVisible = true;
            if (options.customClass)
            {
               options.customClass = 'sw-infoBox' + ' ' + options.customClass;
            }
            else
            {
               options.customClass = 'sw-infoBox';
            }
            return swPopup.show(options);
         };

      }]
   });

});
