/* jshint browser:true */
define([
   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory'
], function(
   module,
   _,
   ngModule,
   swLoggerFactory
) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.factory('swAbstractScrollerStrategy', [
      function(
      )
   {
      logger.trace('register');

      function AbstractScrollerStrategy($element)
      {
         var api = this;

         /* --- api --- */
         api.getScrollTop     = getScrollTop;
         api.destroy          = _.noop;

         api.setScrollTop     = _unsupported;
         api.getScrollHeight  = _unsupported;
         api.clientHeight     = _unsupported;

         api.getScrollableElement      = _.constant($element);

         api._setScrollTop    = setScrollTop;

         /* === impl === */
         var _offset;

         function getScrollTop()
         {
            return _offset;
         }

         function setScrollTop(offset)
         {
            _offset = offset;
         }
      }

      return AbstractScrollerStrategy;
   }]);

   function _unsupported()
   {
      throw new Error('Unsupported function');
   }
});
