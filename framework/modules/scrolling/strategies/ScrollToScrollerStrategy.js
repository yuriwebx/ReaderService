/* jshint browser:true */
define([
   'module',
   'underscore',
   'jquery',
   'ngModule',
   'swLoggerFactory',
   'less!./ScrollToScrollerStrategy'
], function(
   module,
   _,
   $,
   ngModule,
   swLoggerFactory
) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.factory('swScrollToScrollerStrategy', [
      'swAbstractScrollerStrategy',
      function(
         swAbstractScrollerStrategy
      )
   {
      logger.trace('register');

      function ScrollToScrollerStrategy($element)
      {
         var api = this;
         var $scrollableElement;

         if ($element[0] && $element[0].ownerDocument)
         {
            $scrollableElement = $element;
            $scrollableElement.parent().addClass('vs-isolated-flow');
         }
         else
         {
            $scrollableElement = $(document);
            $element = $('body');
         }

         swAbstractScrollerStrategy.call(this, $element);

         /* --- api --- */
         api.setScrollTop     = setScrollTop;
         api.getScrollHeight  = getScrollHeight;
         api.clientHeight     = clientHeight;

         /* === impl === */

         (function _init() {
            api.setScrollTop($scrollableElement.scrollTop());
         })();

         function getScrollHeight()
         {
            return $element[0].scrollHeight;
         }

         function clientHeight()
         {
            return Math.min($element[0].clientHeight, window.innerHeight);
         }

         function setScrollTop(offset)
         {
            $scrollableElement.scrollTop(offset);
            api._setScrollTop(offset);
         }
      }

      _.extend(ScrollToScrollerStrategy.prototype, swAbstractScrollerStrategy.prototype);

      return ScrollToScrollerStrategy;
   }]);
});
