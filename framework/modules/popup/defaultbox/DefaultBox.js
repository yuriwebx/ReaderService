define([

   'module',
   'underscore',
   'swServiceFactory',
   'text!./DefaultBox.html',
   'less!./DefaultBox',

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
            options.backdropVisible = true;
            if (options.customClass)
            {
               options.customClass = 'sw-DefaultBox' + ' ' + options.customClass;
            }
            else
            {
               options.customClass = 'sw-DefaultBox';
            }
            return swPopup.show(options);
         };

      }]
   });

});
