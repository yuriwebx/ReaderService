define([
   'module',
   'jquery',
   'underscore',
   'ngModule',
   'swLoggerFactory',
   'less!./StandardScroll'
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

   ngModule.factory('swStandardScroll', [
      'swAbstractScroll',
//      'swFeatureDetector',
      '$window',

      function(
         swAbstractScroll,
//         swFeatureDetector,
         $window)
   {
      logger.trace('register');

      var CLASS_NAME = 'sw-standard-scroll';

      function StandardScroll($elem, options)
      {
         this.$elem = $elem;
         swAbstractScroll.call(this, $elem, options);
         $elem.on('scroll.swStandardScroll', this._onScroll.bind(this));

///////////////////////////////////////////////////////////////////////////////
// prevent blinks toolbar in ie
// for more information look at MSDN:
// https://social.msdn.microsoft.com/Forums/ie/en-US/9567fc32-016e-48e9-86e2-5fe51fd67402/new-bug-in-ie11-scrolling-positionfixed-backgroundimage-elements-jitters-badly#21ef38f3-87b7-4e77-a3ad-0207f50e34be
//         if ( !swFeatureDetector.useSmoothScrolling() )
//         {
//            var self = this;
//            $elem.on('mousewheel.swStandardScroll', function($event) {
//               $event.preventDefault();
//               var wd = $event.originalEvent.wheelDelta;
//               var csp = self.getScrollTop();
//               self.setScrollTop(csp - wd);
//            });
//         }
///////////////////////////////////////////////////////////////////////////////
// The above workaround causes problems with select2 scrolling.
// Testing shows that, seems, MS fixed the original issue already.
// At least toolbar does not blinks now :)
///////////////////////////////////////////////////////////////////////////////

         $elem.addClass(CLASS_NAME);

         if ( options.preventParentScroll )
         {
            $elem.on('touchstart.swStandardScroll', _.partial(_preventParentScroll, $elem));
            $elem.on('touchmove.swStandardScroll', _.partial(_preventScrollForUnscrollable, $elem));
         }
      }

      _.extend(StandardScroll.prototype, swAbstractScroll.prototype, {
         getScrollTop : function()
         {
            return this.$elem.scrollTop();
         },
         setScrollTop : function(val)
         {
            var st = this.getScrollTop();
            this.$elem.scrollTop(val);
            if (st === val) {
               this._onScroll();
            }
         },
         destroy : function()
         {
            this.$elem.off('.swStandardScroll');
            this.$elem.removeClass(CLASS_NAME);
            swAbstractScroll.prototype.destroy.call(this);
         },
         getScrollHeight: function() {
            var elem = _elem(this.$elem);
            return elem.scrollHeight;
         },
         isVisible : function()
         {
            var elem = _elem(this.$elem);
            return elem.scrollHeight > elem.clientHeight;
         }
      });

      function _elem($elem)
      {
         var elem = $elem.get(0);
         elem = elem === $window ? $window.document.body : elem;
         return elem;
      }

      function _preventParentScroll($elem)
      {
         var scroller = _elem($elem);

         if ($elem.scrollTop() === 0)
         {
            $elem.scrollTop(1);
         }

         var scrollTop = scroller.scrollTop;
         var scrollHeight = scroller.scrollHeight;
         var offsetHeight = scroller.offsetHeight;
         var contentHeight = scrollHeight - offsetHeight;
         if (contentHeight === scrollTop)
         {
            $elem.scrollTop(scrollTop - 1);
         }
      }

      function _preventScrollForUnscrollable($elem, ev)
      {
         ev.stopPropagation();
         if ($(ev.target).is('input[type=range], textarea'))
         {
            return true;
         }

         var elem = _elem($elem);
         if ( elem.scrollHeight === Math.min( $window.innerHeight, elem.clientHeight) )
         {
            ev.preventDefault();
         }
      }

      return StandardScroll;
   }]);
});
