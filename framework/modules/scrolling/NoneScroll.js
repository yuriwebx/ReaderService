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

   ngModule.factory('swNoneScroll', ['swAbstractScroll', '$window', function(swAbstractScroll, $window)
   {
      logger.trace('register');

      var CLASS_NAME = 'sw-none-scroll';

      function NoneScroll($elem, options)
      {
         swAbstractScroll.call(this, $elem, options);
         $elem.addClass(CLASS_NAME);
      }

      _.extend(NoneScroll.prototype, swAbstractScroll.prototype);
      _.extend(NoneScroll.prototype, {
         getScrollTop : _.constant(0),
         setScrollTop : _.noop,
         destroy : function()
         {
            var $elem = this.getScrollableElement();
            $elem.removeClass(CLASS_NAME);
         },
         getScrollHeight: function() {
            var elem = this.getScrollableElement().get( 0 );
            elem = elem === $window ? $window.document.body : elem;
            return elem.scrollHeight;
         },
         isVisible : _.constant(false)
      });

      return NoneScroll;
   }]);
});
