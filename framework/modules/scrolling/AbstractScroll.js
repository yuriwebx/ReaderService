/**
 * @class AbstractScroll
 * @description Simple scroll API
 *
 * Public Attributes:
 *    "id"              : unique identifier of current scroll
 *
 * Public Methods:
 *    "addListener"     : add listener. This listener will be called when element will scrolling
 *    "removeListener"  : remove listener
 *    "getScrollTop"    : get scroll offset
 *    "setScrollTop"    : set scroll offset
 *    "scrollIntoView"  : scrolls the element into the visible area of the browser window
 *    "destroy"         : destroy scroll and unbind inner listeners
 *    "isActive"        : Check if scroll has not destroyed yet. Return false, if scroll already destroyed
 *    "isVisible"       : Check is scroll visible
 *    "changeOptions"   : Change some options for scroll on fly
 *    "isElementVisible": Check element's visibility on viewport
 *    "getScrollableElement"  : return scrollable element
 *    "scrollIntoViewIfNeeded": Scrolls the element into the visible area of the browser window if it's not already within
 *    "preventScrollHandling": stops _onScroll listeners from firing when event is raised
 *    "resumeScrollHandling": resumes normal handling of _onScroll event by listeners
 */
define([
   'module',
   'underscore',
   'jquery',
   'ngModule',
   'swLoggerFactory'
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

   ngModule.factory('swAbstractScroll', ['$window', 'swStickyService', function($window, swStickyService)
   {
      logger.trace('register');

      /**
       * @constructor
       */
      function AbstractScroll($el, options)
      {
         this.listeners = [];
         this._preventScrollHandling = false;

         if ( _.has(options, 'listener') )
         {
            this.listeners.push(options.listener);
            delete options.listener;
         }
         this.id = _.uniqueId('scroll:');
         this.getScrollableElement = function()
         {
            return $el;
         };
         this._getOptions = function _getOptions() {
             return options;
         };
         this._getOption = function _getOption(name) {
             return options[name];
         };
         this.changeOptions = function changeOptions(opts) {
             var _opts = _.extend({}, options, opts);
             options = Object.freeze(_opts);
         };
      }

      /**
       * add listener. This listener will be called when element will scrolling
       * @param {Function} listener - on scroll listener
       */
      AbstractScroll.prototype.addListener = function(listener)
      {
         this.listeners.push(listener);
      };

      /**
       * remove listener
       * @param  {Function} listener - on scroll listener
       */
      AbstractScroll.prototype.removeListener = function(listener)
      {
         _.remove(this.listeners, function(_listener)
         {
            return _listener === listener;
         });
      };

      /**
       * on scroll event. Called when element will scrolled
       * @protected
       */
      AbstractScroll.prototype._onScroll = function()
      {
         if ( this._preventScrollHandling ) {
            return;
         }

         var offset = this.getScrollTop();
         _.each(this.listeners, function(listener)
         {
            listener(offset);
         });
      };

      /**
       * Prevents event handling (similar to event.preventDefault()
       * It's used when a client manipulates the scrollable element's contents in some way
       * that may cause unneeded side effects
       */
      AbstractScroll.prototype.preventScrollHandling = function()
      {
         this._preventScrollHandling = true;
      };

      /**
       * Resumes normal scroll event handling
       */
      AbstractScroll.prototype.resumeScrollHandling = function()
      {
         this._preventScrollHandling = false;
      };

      /**
       * get scroll offset
       * @return {Number} scroll offset
       */
      AbstractScroll.prototype.getScrollTop = function()
      {
         throw new Error('Unsupported operation exception.');
      };

      /**
       * set scroll offset
       * @property {Number} offset
       */
      AbstractScroll.prototype.setScrollTop = function()
      {
         throw new Error('Unsupported operation exception.');
      };

      /**
       * Destroy scroll and unbind inner listeners
       */
      AbstractScroll.prototype.destroy = function()
      {
         this.isActive = _.constant(false);
      };

      /**
       * Check is scroll visible
       */
      AbstractScroll.prototype.isVisible = function()
      {
         throw new Error('Unsupported operation exception.');
      };

      /**
       * Get scroll height
       */
      AbstractScroll.prototype.getScrollHeight = function()
      {
         throw new Error('Unsupported operation exception.');
      };

      /**
       * Check if scroll has not destroyed yet. Return false, if scroll already destroyed
       */
      AbstractScroll.prototype.isActive = _.constant(true);

      AbstractScroll.prototype.getScrollableElementRect = function()
      {
         var $scrollableElement = this.getScrollableElement();
         var stickyHeight = swStickyService.getStickyHeightOver(this);
         var scrollTop = this.getScrollTop();
         var elOffset = $scrollableElement ? $scrollableElement.offset() : 0;

         var top = stickyHeight;
         var bottom = $scrollableElement.height() - swStickyService.getStickyHeightUnder(this);

         if (stickyHeight) {
            top += scrollTop;
            bottom += scrollTop;
         }
         else {
            top += elOffset ? elOffset.top : 0;
         }
         return {
            top: top,
            bottom: bottom
         };
      };

      /**
       * scrolls the element into the visible area of the browser window
       */
      AbstractScroll.prototype.scrollIntoView = function(element, alignToTop)
      {
         element = $(element);
         alignToTop = _.isBoolean(alignToTop) ? alignToTop : true;
         var top = _getOffsetTop(element, this.getScrollableElement());

         if ( alignToTop )
         {
            top -= swStickyService.getStickyHeightOver(this);
         }
         else
         {
            top -= this.clientHeight() - swStickyService.getStickyHeightUnder(this);
            top += element.outerHeight();
         }

         this.setScrollTop(Math.round(top));
      };

      AbstractScroll.prototype.scrollIntoViewWithOffset = function(element, offset)
      {
         element = $(element);

         if (Math.abs(element.offset().top - offset) < 5) //magic number, which compensates the difference in calculation of CSS pixels and real device pixels
         {
            return;
         }

         var sticky = swStickyService.getStickyHeightOver(this);
         var clientHeight = this.clientHeight() - sticky - swStickyService.getStickyHeightUnder(this);
         var top = _getOffsetTop(element, this.getScrollableElement()) - sticky;
         offset = offset >= sticky ? offset : sticky;
         offset = clientHeight >= offset  ? offset : clientHeight;
         top -= offset - sticky;

         this.setScrollTop(parseInt(top));
      };

      AbstractScroll.prototype.clientHeight = function()
      {
         var $element = this.getScrollableElement();
         return Math.min($element.height(), $window.innerHeight);
      };

      /**
       * Check element's visibility on viewport
       */
      AbstractScroll.prototype.isElementVisible = function(element)
      {
         element = $(element);

         if ( _elementOrParentIsFixed(element, this.getScrollableElement()) )
         {
            // if element or parent has position fixed (or absolute)
            // think that it already visible
            return true;
         }

         var top     = _getOffsetTop(element, this.getScrollableElement()),
             height  = element.outerHeight(),
             scrollTop  = this.getScrollTop(),
             overTop    = top < (scrollTop + swStickyService.getStickyHeightOver(this)),
             overBottom = (top + height) > (scrollTop + this.clientHeight() - swStickyService.getStickyHeightUnder(this));

         return (!overTop && !overBottom) || (overTop && overBottom);
      };

      function _elementOrParentIsFixed($element, $scrollableElement)
      {
         if ( $element[0] === $scrollableElement[0] || $element.is('html') || $element.length === 0 )
         {
            return false;
         }

         return $element.css('position') === 'fixed' ? true :
            _elementOrParentIsFixed($element.parent(), $scrollableElement);
      }

      /**
       * Scrolls the element into the visible area of the browser window if it's not already within
       */
      AbstractScroll.prototype.scrollIntoViewIfNeeded = function(element, alignToTop, needToRetry)
      {
         needToRetry = _.isBoolean(needToRetry) ? needToRetry : true;
         if ( this.isElementVisible(element) )
         {
            return;
         }

         element = $(element);
         alignToTop = _.isBoolean(alignToTop) ? alignToTop : true;
         this.scrollIntoView(element, alignToTop);

         if (needToRetry)
         {
            _.defer(_.bind(this.scrollIntoViewIfNeeded, this, element, alignToTop, false));
         }
      };

      AbstractScroll.prototype.isUseTransform = _.constant(false);

      function _getOffsetTop(element, scrollable)
      {
         var top = element.offset().top;
         var children = scrollable.children();
         top -= children.length ? children.offset().top : 0;
         return top;
      }

      return AbstractScroll;
   }]);
});
