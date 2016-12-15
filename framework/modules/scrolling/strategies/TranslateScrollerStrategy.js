/* jshint browser:true */
define([
   'module',
   'jquery',
   'underscore',
   'ngModule',
   'swLoggerFactory',
   'less!./TranslateScrollerStrategy'
], function(
   module,
   $,
   _,
   ngModule,
   swLoggerFactory
) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.factory('swTranslateScrollerStrategy', [
      'swAbstractScrollerStrategy',
      'swStickyService',
      function(
         swAbstractScrollerStrategy,
         swStickyService
      )
   {
      logger.trace('register');

      var WRAPPER_CLASSNAME   = 'sw-vscroll-wrapper';
      var SCROLLER_CLASSNAME  = 'sw-vscroll-scroller';

      function VirtualTranslateScroll($element, scroll)
      {
         var api = this;
         swAbstractScrollerStrategy.call(this, $element);

         /* --- api --- */
         api.setScrollTop     = setScrollTop;
         api.getScrollHeight  = getScrollHeight;
         api.clientHeight     = clientHeight;
         api.destroy          = destroy;

         api.getScrollableElementRect  = getScrollableElementRect;
         api.getScrollableElement      = getScrollableElement;

         /* === impl === */
         var $wrapper   = _wrap($element),
             $scroller  = $wrapper.children('.' + SCROLLER_CLASSNAME);

         (function _init() {
            setScrollTop(0);

            $wrapper.on('scroll', function()
            {
               $wrapper.scrollTop(0);
            });
         })();

         function getScrollHeight()
         {
            return $scroller.height();
         }

         function clientHeight()
         {
            return $wrapper[0].clientHeight;
         }

         function setScrollTop(offset)
         {
            $scroller.css('transform', 'translateY(' + (-offset) + 'px)');
            api._setScrollTop(offset);
         }

         function getScrollableElementRect()
         {
            var rect = $wrapper[0].getClientRects()[0];
            rect = _.pick(rect, 'top', 'bottom', 'left', 'right');
            rect.top += swStickyService.getStickyHeightOver(scroll);
            rect.bottom -= swStickyService.getStickyHeightUnder(scroll);
            return rect;
         }

         function getScrollableElement()
         {
            return $scroller;
         }

         function destroy()
         {
            $scroller.children().children().unwrap().unwrap().unwrap();
         }
      }
      _.extend(VirtualTranslateScroll.prototype, swAbstractScrollerStrategy.prototype);

      function _wrap($element)
      {
         var mock = $('<div>');
         mock.append($element.children());
         $element.append(mock);

         mock.wrap('<div class="' + WRAPPER_CLASSNAME + '"><div class="' + SCROLLER_CLASSNAME + '"></div></div>');

         return mock.closest('.' + WRAPPER_CLASSNAME);
      }

      return VirtualTranslateScroll;
   }]);
});
