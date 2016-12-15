define([

   'module',
   'underscore',
   'swServiceFactory',
   'text!./ContextMenu.html',
   'less!./ContextMenu'
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
            options.layout.arrow = true;
            options.layout.my = 'RT';
            options.layout.at = 'RB';
            options.content = content;
            options.modal = false;
            options.backdropEvents = true;
            if (options.customClass)
            {
               options.customClass = 'sw-contextMenu' + ' ' + options.customClass;
            }
            else
            {
               options.customClass = 'sw-contextMenu';
            }

            options.contextMenuItems = options.contextMenuItems || [];
            options.actions = options.contextMenuItems;
            
            options.extendScope = {
               contextMenuItems: options.contextMenuItems
            };
            
            return swPopup.show(options);
         };

      }]
   });

});