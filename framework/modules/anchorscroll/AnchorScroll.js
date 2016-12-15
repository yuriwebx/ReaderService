define([

   'module',
   'jquery',
   'swServiceFactory'

   ], function(

   module,
   $,
   swServiceFactory

   ){

   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['swFocusManagerService', function(swFocusManagerService)
      {
         var _this = this;
         
         /*
          * Performs scrolling so that element <a name="anchorName"> becomes visible for the user
          * @param anchorName
          */
         this.scrollIntoView = function(anchorName)
         {
            _this.logger.trace('request', anchorName);
            swFocusManagerService.whenIdle('swAnchorScroll.scrollIntoView ' + anchorName).then(function()
            {
               _scrollIntoView(anchorName);
            });
         };
         
         function _scrollIntoView(anchorName)
         {
            var a = $('a[name="' + anchorName + '"]');
            if ( a.length )
            {
               _this.logger.trace('perform', anchorName);
               a[0].scrollIntoView();
            }
            else
            {
               _this.logger.warn(anchorName, 'not found');
            }
         }
         
      }]
   });

});