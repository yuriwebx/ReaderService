define([
   'module',
   'underscore',
   'jquery',
   'ngModule',
   'swLoggerFactory',
   'baron',
   'less!./BaronScroll.less'
], function(
   module,
   _,
   $,
   ngModule,
   swLoggerFactory,
   baron
) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.factory('swBaronScroll', [
      'swAbstractScroll',
      '$window',

      function(
         swAbstractScroll,
         $window
      )
   {
      logger.trace('register');

      var WRAPPER_CLASSNAME   = 'sw-baron-wrapper';
      var SCROLLER_CLASSNAME  = 'sw-baron-scroller';
      var SCROLLBAR_CLASSNAME = 'sw-baron-scroller__bar';
      var SCROLLABLE_CLASSNAME = 'sw-scrollable';

      var _default = {
         autowrap : true
      };

      function BaronScroll($elem, options)
      {
         options = _.defaults(options || {}, _default);
         this.autowrap = options.autowrap;
         this.$elem = options.autowrap ? _wrap($elem, options) : $elem;

         var wrapper = this.$elem.closest('.' + WRAPPER_CLASSNAME);

         wrapper.height(options.height || wrapper.parent().height());

         this.baron = _baron(wrapper);

         var scroller = this.$elem.closest('.' + SCROLLER_CLASSNAME);
         scroller.addClass(SCROLLABLE_CLASSNAME);
         scroller.on('scroll.swBaronScroll', this._onScroll.bind(this));

         swAbstractScroll.call(this, scroller, options);

         _.defer(function() {
            scroller.trigger('sizeChange');
         });
      }

      _.extend(BaronScroll.prototype, swAbstractScroll.prototype);
      _.extend(BaronScroll.prototype, {
         getScrollHeight: function() {
            var elem = _elem(this.$elem);
            return elem.scrollHeight;
         },
         getScrollTop : function()
         {
            return this.baron.length && this.baron[0].pos();
         },
         setScrollTop : function(val)
         {
            var st = this.getScrollTop();
            if (this.baron.length) {
               this.baron[0].pos(val);
            }
            if (st === val) {
               this._onScroll();
            }
         },
         destroy : function()
         {
            this.$elem.closest('.' + SCROLLER_CLASSNAME).off('scroll.swBaronScroll');
            this.baron.dispose();

            if (this.autowrap)
            {
               this.$elem.siblings('.' + SCROLLBAR_CLASSNAME).remove();
               this.$elem.children().unwrap().unwrap().unwrap();
            }
            swAbstractScroll.prototype.destroy.call(this);
         },
         isVisible : function()
         {
            return true;
         }
      });

      function _baron(wrapper)
      {
         return baron({
            $        : $,
            root     : wrapper,
            scroller : '.' + SCROLLER_CLASSNAME,
            bar      : '.' + SCROLLBAR_CLASSNAME
         });
      }

      function _wrap($elem, options)
      {

         if (!$elem[0] || !$elem[0].ownerDocument)
         {
            $elem = $('body');
            options.height = '100%';
         }

         var mock = $('<div>');
         mock.append($elem.children());
         $elem.append(mock);

         $elem = mock;

         var bar = $('<div>').addClass(SCROLLBAR_CLASSNAME);

         $elem.wrap('<div class="' + WRAPPER_CLASSNAME + '"><div class="' + SCROLLER_CLASSNAME + '"></div></div>');

         var scroller = $elem.closest('.' + SCROLLER_CLASSNAME);
         scroller.append(bar);

         return $elem;
      }

      function _elem($elem)
      {
         var elem = $elem.get(0);
         elem = elem === $window ? $window.document.body : elem;
         return elem;
      }

      return BaronScroll;
   }]);
});
