/**
 * Service for encapsulate work with Standard/Virtual scrolling.
 *
 * Service automatically adds class 'sw-application-scroll-top-on' to body when scroll position == 0,
 * otherwise adds class 'sw-application-scroll-top-off'
 *
 * API:
 *
 * swApplicationScroll.resetScroll()
 *    BusinessFunction*. Scroll to top left corner
 *
 * swApplicationScroll.getScrollTop()
 *    Get the current vertical position of the scroll bar
 *
 * swApplicationScroll.setScrollTop(offset)
 *    Set the current vertical position of the scroll bar
 *
 * swApplicationScroll.scrollIntoView(element, alignToTop)
 *    Scrolls the element into the visible area of the browser window.
 *    alignToTop:
 *       - If <code>true</code>, the top of the element will be aligned to the top of the visible area of the scrollable ancestor.
 *       - If <code>false</code>, the bottom of the element will be aligned to the bottom of the visible area of the scrollable ancestor.
 *
 * swApplicationScroll.scrollIntoViewIfNeeded(element, alignToTop)
 *    Scrolls the element into the visible area of the browser window
 *    if it's not already within the visible area of the browser window
 *    alignToTop:
 *       - If <code>true</code>, the top of the element will be aligned to the top of the visible area of the scrollable ancestor.
 *       - If <code>false</code>, the bottom of the element will be aligned to the bottom of the visible area of the scrollable ancestor.
 *
 * swApplicationScroll.isVisible()
 *    Check scroll visibility.
 *    Return <code>true</code> if scroll visible, otherwise - <code>false</code>
 *
 * swApplicationScroll.addListener(listener)
 *    Add scroll listener. This listeners calling every time when user scrolls page.
 *
 * swApplicationScroll.removeListener(listener)
 *    Remove scroll listener.
 *
 * swApplicationScroll.changeScrollType(type, $elem)
 *    Change scroll type ('STANDARD'/'VIRTUAL') for $elem (default: window).
 *
 * swApplicationScroll.addScrollTopListener(listener)
 *    Add listener that called when scroll position is changed from top to non-top or vice versa.
 *    If listener changes the DOM so that body height is changed then the listener should
 *    return promise that is resolved when changes are actually applied to DOM.
 *
 * swApplicationScroll.removeScrollTopListener(listener)
 *    Remove scrollTop listener.
 *
 * swApplicationScroll.getScrollHeight()
 *    Get scroll height
 *
 * swApplicationScroll.getScrollableElement()
 *    Get current scrollable element
 *
 * swApplicationScroll.isElementVisible(elem)
 *    Check element's visibility on viewport
 *
 *
 * * BusinessFunction - is a function. Calling it doesn't produced to control body height. For example,
 * when we are calling `resetScroll` when move to another state we don't need to control visibility of scroll
 *
 */
define([
   'module',
   'underscore',
   'jquery',
   'swServiceFactory'
], function(
   module,
   _,
   $,
   swServiceFactory
) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [

         '$q',
         '$window',
         'swScrollFactory',

         function(

            $q,
            $window,
            swScrollFactory

         )
      {

         /* --- api --- */
         this.resetScroll      = resetScroll;
         this.getScroll        = getScroll;
         this.getScrollTop     = getScrollTop;
         this.setScrollTop     = setScrollTop;
         this.isVisible        = isVisible;
         this.isElementVisible = isElementVisible;
         this.addListener      = addListener;
         this.removeListener   = removeListener;
         this.getScrollHeight  = getScrollHeight;
         this.scrollIntoView   = scrollIntoView;
         this.isUseTransform   = isUseTransform;
         this.changeScrollType = changeScrollType;
         this.changeOptions    = changeOptions;
         this.scrollIntoViewIfNeeded   = scrollIntoViewIfNeeded;
         this.scrollIntoViewWithOffset = scrollIntoViewWithOffset;
         this.getScrollableElement     = getScrollableElement;
         this.addScrollTopListener     = addScrollTopListener;
         this.removeScrollTopListener  = removeScrollTopListener;
         this.preventScrollHandling    = preventScrollHandling;
         this.resumeScrollHandling     = resumeScrollHandling;

         /* === impl === */


         var _listeners    = [],
             _prevOffset   = null,
             _scroll       = null,
             _logger       = this.logger,
             _actionsBuffer      = [],
             _scrollTopListeners = [];

         var SCROLL_TOP_ON_CLASS    = 'sw-application-scroll-top-on',
             SCROLL_TOP_OFF_CLASS   = 'sw-application-scroll-top-off';

         var $body = $('body');

         var BUSINESS_ACTIONS = ['resetScroll'];

         _.defer(function()
         {
            $body.addClass(SCROLL_TOP_ON_CLASS);
            if ( !_scroll )
            {
               _logger.trace('create default scroll');
               changeScrollType();
            }
         });

         addListener(_bodyControlListener);

         function getScrollTop()
         {
            return _safeProxyCall('getScrollTop') || 0;
         }

         function setScrollTop(offset)
         {
            return _safeProxyCall('setScrollTop', offset);
         }

         function scrollIntoView(element, alignToTop)
         {
            return _safeProxyCall('scrollIntoView', element, alignToTop);
         }

         function scrollIntoViewIfNeeded(element, alignToTop)
         {
            return _safeProxyCall('scrollIntoViewIfNeeded', element, alignToTop);
         }

         function scrollIntoViewWithOffset(element, offset)
         {
            return _safeProxyCall('scrollIntoViewWithOffset', element, offset);
         }

         function isElementVisible(element)
         {
            return _safeProxyCall('isElementVisible', element);
         }

         function isVisible()
         {
            return _safeProxyCall('isVisible');
         }

         function changeOptions(options)
         {
             return _safeProxyCall('changeOptions', options);
         }

         function addListener(listener)
         {
            _listeners.push(listener);
            _safeProxyCall('addListener', listener);
         }

         function removeListener(listener)
         {
            _.remove(_listeners, _equalsPredicate(listener));
            _safeProxyCall('removeListener', listener);
         }

         function addScrollTopListener(listener)
         {
            _scrollTopListeners.push(listener);
         }

         function removeScrollTopListener(listener)
         {
            _.remove(_scrollTopListeners, _equalsPredicate(listener));
         }

         function getScrollHeight()
         {
            return _safeProxyCall('getScrollHeight');
         }

         function getScrollableElement()
         {
            return _safeProxyCall('getScrollableElement');
         }

         function preventScrollHandling()
         {
            return _safeProxyCall('preventScrollHandling');
         }

         function resumeScrollHandling()
         {
            return _safeProxyCall('resumeScrollHandling');
         }

         function isUseTransform()
         {
            return _safeProxyCall('isUseTransform');
         }

         function _equalsPredicate(obj)
         {
            return function(other)
            {
               return obj === other;
            };
         }

         function resetScroll()
         {
            _actionsBuffer.push('resetScroll');
            _safeProxyCall('setScrollTop', 0);
            _bodyControlListener();
         }

         function changeScrollType(type, $element, options)
         {
            if (_scroll)
            {
               resetScroll();
               _scroll.destroy();
            }

            _scroll = swScrollFactory.createScroll(type, $element, options);
            _listeners.forEach(function(listener)
            {
               _scroll.addListener(listener);
            });
            _getContentElement().css('padding-bottom', 0);
         }

         function _safeProxyCall(funcName)
         {
            _actionsBuffer.push(funcName);
            if ( _scroll )
            {
               _logger.trace(funcName);
               var args = Array.prototype.slice.call(arguments, 1);
               return _scroll[funcName].apply(_scroll, args);
            }
         }

         function getScroll()
         {
            return _scroll;
         }

         function _getContentElement()
         {
            var element = _scroll.getScrollableElement();
            return element[0].ownerDocument ? element.children().eq(0) : $body;
         }

         function _containsBusinessAction()
         {
            return _.some(_actionsBuffer, function(action)
            {
               return _.includes(BUSINESS_ACTIONS, action);
            });
         }

         function _bodyControlListener()
         {
            var offset = getScrollTop();
            _logger.trace('scroll', offset);

            if ( (offset > 0) === (_prevOffset > 0) )
            {
               _actionsBuffer.length = 0;
               return;
            }

            var restoreHeight = _containsBusinessAction() ? _.noop : _adjustHeight();

            var onTop = offset <= 0;
            _logger.trace('onTop:', onTop);

            $body.toggleClass(SCROLL_TOP_ON_CLASS,   onTop);
            $body.toggleClass(SCROLL_TOP_OFF_CLASS, !onTop);

            var promises = [ $q.when(true) ];
            _.each(_scrollTopListeners, function(listener)
            {
               promises.push($q.when(listener(offset)));
            });

            $q.all(promises).then(restoreHeight);

            _prevOffset = offset;
            _actionsBuffer.length = 0;
         }

         function _adjustHeight()
         {
            var contentElement = _getContentElement();
            var initialHeight = contentElement.height();
            // store current body height that scroll is not hidden.
            contentElement.css('height', initialHeight + 1);
            contentElement.css('padding-bottom', 0);

            return function restoreBodyHeight()
            {
               var currentHeight = _scrollableElementHeights();
               _logger.trace('body height changed from', initialHeight, 'to', currentHeight);
               var paddingBottom = 0;
               var innerHeight = _scroll.getScrollableElement().innerHeight();
               if ( currentHeight <= $window.innerHeight && currentHeight <= innerHeight )
               {
                  paddingBottom = Math.max(0, innerHeight - currentHeight) + 1;
               }
               contentElement.css('padding-bottom', paddingBottom);
               contentElement.css('height', '');
            };
         }

         var nonFlowPosition = ['absolute', 'fixed'];
         function _scrollableElementHeights()
         {
            var height = 0;
            _getContentElement().children(':visible').each(function() {
               var $el = $(this);
               if (nonFlowPosition.indexOf($el.css('position')) === -1)
               {
                  height += $el.height();
               }
            });
            return height;
         }
      }]
   });
});
