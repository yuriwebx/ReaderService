/* jshint browser:true */
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

   ngModule.factory('swVirtualScroll', [
      'swFeatureDetector',
      'swAbstractScroll',
      'swUserInputBlockerRegistry',
      'swScrollAnimator',
      'swScrollUtils',
      'swScrollToScrollerStrategy',
      'swTranslateScrollerStrategy',
      'swStickyService',
      function(
         swFeatureDetector,
         swAbstractScroll,
         swUserInputBlockerRegistry,
         ScrollAnimator,
         swScrollUtils,
         swScrollToScrollerStrategy,
         swTranslateScrollerStrategy,
         swStickyService
      )
   {
      logger.trace('register');

      var CLASS_NAME          = 'sw-virtual-scroll';
      var ANIMATE_CLASSNAME   = 'sw-vscroll-animate';

      var defaults = {
         animate        : false,
         useMomentum    : false,
         scrollTapRate  : 0,
         tapMode        : 'tb', // 'tb|lr'
         snapOnMomentum : _.identity,
         minScrollDistance : 2,     // pixels
         scrollEdgeWidth   : 0,     // pixels
         useGentle         : false,
         momentumDeceleration : 0.0025,
         useInternalScrolling : true,  // if false we will scroll only by edge
         gentleDebounceTime   : 0,
         tapAnimateDuration   : 500
      };

      function VirtualScroll($element, options)
      {
         var api = this;

         options = _.defaults({}, options, defaults);

         if (!$element[0] || !$element[0].ownerDocument)
         {
            $element = $('body');
         }

         swAbstractScroll.call(this, $element, options);

         /* --- api --- */
         api.destroy       = destroy;

         api.isUseTransform   = isUseTransform;
         api.setScrollTop     = setScrollTop;
         api.getScrollTop     = getScrollTop;
         api._getScrollTop    = _strategyProxyCaller('getScrollTop');

         api.getScrollHeight  = _strategyProxyCaller('getScrollHeight');
         api.clientHeight     = _strategyProxyCaller('clientHeight');
         api.getScrollableElement      = _strategyProxyCaller('getScrollableElement');
         api.getScrollableElementRect  = _strategyProxyCaller('getScrollableElementRect');

         /* === impl === */

         var _getY   = _.flow(_prepareEvent, _.property('clientY')),
             _getX   = _.flow(_prepareEvent, _.property('clientX')),
             autoscroll = _detectAutoScroll(),
             _useAnimation    = _useCssAnimation();

         $element.toggleClass('sw-custom-scroll', true);

         var Strategy      = _detectStrategy(),
             strategy      = new Strategy($element, api),
             animator      = new ScrollAnimator(strategy, _scrollTop),
             lastMoveTime  = swScrollUtils.now(),
             prevX         = 0,
             prevY         = 0,
             startY        = 0,
             startX        = 0,
             startMoveTime = 0,
             direction     = 0,
             maxOffset     = 0,
             DURATION      = 100,
             viewportWidth    = 0,
             viewportHeight   = 0,
             _clientHeight    = _gentleMe(_clientHeightImmediately, api),
             _getScrollHeight = _gentleMe(_getScrollHeightImmediately, api),
             _getStickyHeightOver   = _gentleMe(_getStickyHeightOverImmediately, api),
             _getStickyHeightUnder  = _gentleMe(_getStickyHeightUnderImmediately, api),
             scrollHandlingRequestId = false,
             scheduledAnimationFrame = false;

         (function _init() {
            updateContentSize();

            if ('ontouchstart' in $element[0])
            {
               $element[0].addEventListener('touchstart',   _press);
               $element[0].addEventListener('touchmove',    _drag);
               $element[0].addEventListener('touchend',     _release);
               $element[0].addEventListener('touchcancel',  _release);
            }
            else
            {
               $element[0].addEventListener('wheel',        _wheelscroll);
               window.document.addEventListener('keydown',  _ownerKeydown);
            }

            $element.addClass(CLASS_NAME);
            api.getScrollableElement().toggleClass(ANIMATE_CLASSNAME, _useAnimation);

            $(window).on('resize', updateContentSize);
         })();

         function destroy()
         {
            strategy.destroy();
            $element.removeClass(CLASS_NAME);
            $element[0].removeEventListener('touchstart',   _press);
            $element[0].removeEventListener('touchmove',    _drag);
            $element[0].removeEventListener('wheel',        _wheelscroll);
            $element[0].removeEventListener('touchend',     _release);
            $element[0].removeEventListener('touchcancel',  _release);

            window.document.removeEventListener('keydown',  _ownerKeydown);
            $(window).off('resize', updateContentSize);
            swAbstractScroll.prototype.destroy.call(api);

            if (scrollHandlingRequestId) {
               cancelAnimationFrame(scrollHandlingRequestId);
            }
         }

         function updateContentSize()
         {
            viewportHeight = $element.height();
            viewportWidth = $element.width();
            maxOffset = Math.abs(Math.round(api.getScrollHeight() - viewportHeight));
         }

         function _ownerKeydown(e)
         {
            var isControlInFocus = document.activeElement.classList.contains('sw-input');
            if ( swUserInputBlockerRegistry.isElementBlocked($element[0]) || isControlInFocus)
            {
               // don't scroll when popup is open
               // and when we are in the edit field
               return true;
            }

            switch (e.keyCode)
            {
               case 36: // Home
                  _setViewportOffset(0); break;
               case 35: // End
                  _setViewportOffset(maxOffset); break;
               case 38: // Up
                  _modifyViewportOffsetBy(-100); break;
               case 40: // Down
                  _modifyViewportOffsetBy(100); break;
               case 33: // PageUp
                  _modifyViewportOffsetBy(-$element[0].clientHeight); break;
               case 34: // PageDown
                  _modifyViewportOffsetBy($element[0].clientHeight); break;
            }
         }

         function _getScrollHeightImmediately()
         {
            return api.getScrollHeight();
         }

         function _clientHeightImmediately()
         {
            return api.clientHeight();
         }

         function _getStickyHeightOverImmediately()
         {
            return swStickyService.getStickyHeightOver(api);
         }

         function _getStickyHeightUnderImmediately()
         {
            return swStickyService.getStickyHeightUnder(api);
         }

         function _normalizeDestination(destination)
         {
            var sh = _getScrollHeight();
            var ch = _clientHeight();
            var max = Math.abs(Math.round(sh - ch));

            destination = Math.max(0, destination);
            destination = Math.min(destination, max);
            return destination;
         }

         function _setViewportOffset(newOffset)
         {
            var offset = api.getScrollTop();

            newOffset = Math.round(newOffset);
            newOffset = _normalizeDestination(newOffset);

            if (offset === newOffset)
            {
               return;
            }

            if (api._getOption('animate'))
            {
               animator.animate(newOffset, DURATION);
            }
            else
            {
               setScrollTop(newOffset);
            }
         }

         function _isCurrentScroll(ev)
         {
            return $(ev.target).closest('.sw-custom-scroll')[0] === $element[0];
         }

         function _preventScroll(ev)
         {
            if ( _isCurrentScroll(ev) )
            {
                if (autoscroll)
                {
                   ev.preventDefault();
                   return false;
                }
                else if (ev.type === 'touchmove' && !_onEdgeChecker(ev))
                {
                    ev.preventDefault();
                }
            }
            else
            {
                return true;
            }

            return swUserInputBlockerRegistry.isElementBlocked($element[0]);
         }

         function _press(ev)
         {
            if (_preventScroll(ev))
            {
               return false;
            }

            animator.stop();
            startY = prevY = _getY(ev);
            startX = prevX = _getX(ev);
            startMoveTime = swScrollUtils.now();
            direction = 0;
         }

         function getScrollTop()
         {
            return animator.inProcess() ? animator.getDestination() : strategy.getScrollTop();
         }

         function setScrollTop(offset)
         {
            if ( _useAnimation )
            {
               api.getScrollableElement().removeClass(ANIMATE_CLASSNAME);
            }
            if ( animator.inProcess() )
            {
               animator.stop();
            }
            offset = _normalizeDestination(offset);
            _scrollTop(offset);

            if (scrollHandlingRequestId) {
               cancelAnimationFrame(scrollHandlingRequestId);
            }

            scrollHandlingRequestId = requestAnimationFrame(function() {
               api.getScrollableElement().toggleClass(ANIMATE_CLASSNAME, _useAnimation);
               api._onScroll();
               scrollHandlingRequestId = false;
            });
        }

         function _scrollTop(offset)
         {
            strategy.setScrollTop(offset);
            api._onScroll();
         }

         function _clearScheduled()
         {
            scheduledAnimationFrame = false;
         }

         function _drag(ev)
         {
            if (scheduledAnimationFrame)
            {
               return true;
            }

            scheduledAnimationFrame = true;
            requestAnimationFrame(_clearScheduled);

            prevX = _getX(ev);

            if ( prevY === 0 || !_onEdgeChecker(ev) || _preventScroll(ev) )
            {
               prevY = 0;
               return false;
            }

            var dragY  = _getY(ev);
            var deltaY = prevY - dragY;
            var now = swScrollUtils.now();

            if ((_sign(deltaY) !== direction) && ((lastMoveTime + 100) > now))
            {
               ev.preventDefault();
               ev.stopPropagation();
               return false;
            }

            if ( _approximatelyEqual(prevY, dragY) )
            {
               return false;
            }

            direction = _sign(deltaY);
            lastMoveTime = now;
            prevY = dragY;
            _modifyViewportOffsetBy(deltaY * _getModifier());
            return false;
         }

         function _getModifier() {
            // #3445
            return api._getOption('useMomentum') ? 1 : 2;
         }

         function _approximatelyEqual(a, b)
         {
            return Math.abs(a - b) <= api._getOption('minScrollDistance');
         }

         function _release() {
            var now = swScrollUtils.now();
            var duration = now - startMoveTime;
            var onEdge = _isOnEdge(startX);

            if ( _approximatelyEqual(prevY, startY) && _approximatelyEqual(prevX, startX) && (duration < 200) )
            {
               if ( onEdge )
               {
                  _tapProcess();
               }
               return false;
            }

            var useInternalScrolling = api._getOption('useInternalScrolling');
            var canScroll = onEdge || useInternalScrolling;

            if ( !api._getOption('useMomentum') || !canScroll )
            {
               prevY = 0;
               return false;
            }

            if ( duration > 300 )
            {
               return true;
            }

            var delta = prevY - startY;
            var st = api._getScrollTop();
            var snap = api._getOption('snapOnMomentum');
            var deceleration = api._getOption('momentumDeceleration');
            var momentum = swScrollUtils.momentum(st, st + delta, duration, deceleration);
            var destination = _normalizeDestination(momentum.destination);
            destination = snap(destination, st, _getStickyHeightOver());
            animator.animate(destination, momentum.duration, animator.circular);
         }

         function _tapProcess()
         {
            var rate = api._getOption('scrollTapRate');
            var topStickyHeight = _getStickyHeightOver();
            var bottomStickyHeight = _getStickyHeightUnder();

            var preventTap = false;
            preventTap = preventTap || !rate;
            preventTap = preventTap || (startY <= topStickyHeight);
            preventTap = preventTap || (startY >= (viewportHeight - bottomStickyHeight));

            if ( preventTap )
            {
               return;
            }
            var destination = api._getScrollTop();
            var delta = viewportHeight * rate;

            var padding = topStickyHeight;
            var mode = api._getOption('tapMode');

            if ( rate === 1 )
            {
               padding += bottomStickyHeight;
            }

            if ( mode === 'lr' )
            {
               if ( startX > api._getOption('scrollEdgeWidth') )
               {
                  destination += delta;
                  destination -= padding;
               }
               else
               {
                  destination -= delta;
                  destination += padding;
               }
            }
            else if ( mode === 'tb' )
            {
               if ( startY < Math.ceil( viewportHeight / 2 ) )
               {
                  destination -= delta;
                  destination += padding;
               }
               else
               {
                  destination += delta;
                  destination -= padding;
               }
            }
            else
            {
               return;
            }

            destination = _normalizeDestination(destination);

            animator.animate(destination, api._getOption('tapAnimateDuration'), animator.circular);
         }

         function _onEdgeChecker(ev)
         {
            var res = false;
            res = res || api._getOption('useInternalScrolling');
            res = res || _isOnEdge(_getX(ev));
            res = res || !_isCurrentScroll(ev);
            return res;
         }

         function _isOnEdge(x)
         {
            var scrollEdgeWidth = api._getOption('scrollEdgeWidth');
            return (x < scrollEdgeWidth) || (x > (viewportWidth - scrollEdgeWidth));
         }

         function _wheelscroll(ev)
         {
            if (_preventScroll(ev))
            {
               return false;
            }

            _modifyViewportOffsetBy(ev.deltaY * (ev.deltaMode === 1 ? 30 : 1));
         }

         function _modifyViewportOffsetBy(delta)
         {
            _setViewportOffset(api.getScrollTop() + delta);
         }

         function _detectStrategy()
         {
            return isUseTransform() ? swTranslateScrollerStrategy : swScrollToScrollerStrategy;
         }

         function _strategyProxyCaller(name)
         {
            return function()
            {
               var args = Array.prototype.slice.call(arguments);
               var fnc = strategy[name] || swAbstractScroll.prototype[name];
               return fnc.apply(strategy, args);
            };
         }

         function isUseTransform() {
            return api._getOption('translate');
         }

      }
      _.extend(VirtualScroll.prototype, swAbstractScroll.prototype);
      _.extend(VirtualScroll.prototype, {
         isVisible: _.constant(false)
      });

      return VirtualScroll;

      function _useCssAnimation()
      {
         return !_detectAutoScroll() && swFeatureDetector.isTouchInput();
      }
   }]);

   function _prepareEvent(event)
   {
      if ('pointers' in event)
      {
      event = event.pointers[0];
      }

      if (event.targetTouches && (event.targetTouches.length >= 1))
      {
      event = event.targetTouches[0];
      }

      return event;
   }

   function _detectAutoScroll()
   {
      return /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
   }

   function _sign(s)
   {
      if (Math.sign)
      {
         return Math.sign(s);
      }

      return s < 0 ? -1 : 1;
   }

   function _gentleMe(fnc, api)
   {
      var _lastResult = null;
      var _debounceWrapper = _.throttle(_ping, api._getOption('gentleDebounceTime'));

      return function _gentleMeCaller()
      {
         if ( _.isNumber(_lastResult) && api._getOption('useGentle') )
         {
            _debounceWrapper();
         }
         else
         {
            _ping();
         }
         return _lastResult;
      };

      function _ping()
      {
         _lastResult = fnc();
      }
   }
});
