define([

   'module',
   'jquery',
   'ngModule',
   'swLoggerFactory',
   'less!./MediaDetector'

   ], function(

   module,
   $,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.service('swMediaDetector', [function()
   {
      logger.trace('register');
      
      // see MediaDetector.less
      // 'font-family' is used to transfer @media from css to js.
      var elem = $('<span class="sw-media-detector"><span class="height"></span></span>');
      elem.appendTo($('body'));
      var elemHeight = elem.find('.height');
      
      var  PORTRAIT_SUFFIX = '_portrait';
      var LANDSCAPE_SUFFIX = '_landscape';
      
      this.detect = function()
      {
         var media = elem.css('font-family');
         logger.trace('@media', media);
         var mediaHeight = elemHeight.css('font-family');
         
         var portrait  = media.indexOf( PORTRAIT_SUFFIX) !== -1;
         var landscape = media.indexOf(LANDSCAPE_SUFFIX) !== -1;

         
         var name = 'unknown';
         if ( portrait )
         {
            name = media.replace( PORTRAIT_SUFFIX, '');
         }
         if ( landscape )
         {
            name = media.replace(LANDSCAPE_SUFFIX, '');
         }
         
         return {
            min:    name === 'min',
            narrow: name === 'narrow',
            normal: name === 'normal',
            wide:   name === 'wide',
            portrait:  portrait,
            landscape: landscape,
            lowHeight:    mediaHeight === 'lowHeight',
            normalHeight: mediaHeight === 'normalHeight'
         };
         
      };
      
   }]);

});