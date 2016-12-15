/**
 * swSticky - directive to make elements stick when scrolling down.
 *
 * Service automatically adds class 'sw-sticky-on' to element when it becomes sticky,
 * otherwise adds class 'sw-sticky-off'
 *
 * When we scroll down we use of a placeholder to stop the page jumping
 * Recalculates element position on page window resize
 * Use stack for handles multiple sticky elements efficiently
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

   var DIRECTIVE = 'swSticky';

   ngModule.directive(DIRECTIVE,
      [

      'swLayoutManager',
      'swScrollFactory',
      'swApplicationScroll',
      'swStickyService',

      function(
         swLayoutManager,
         swScrollFactory,
         swApplicationScroll,
         swStickyService
      ) {

      /* jshint unused:true */
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            var _defaultOptions = {
               debounceTime   : 100,
               alwaysStick    : false,
               widthControl   : true,
               useGentle      : true,
               changeWidthOnScroll  : false
            };

            var id            = _.uniqueId('swSticky:'),
                placeholder   = null,
                _isStickyNow  = false,
                _hasScroll    = null,
                scroll        = null,
                content       = element.parent(),
                _options      = _.defaults(scope.$eval(attr[DIRECTIVE]) || {}, _defaultOptions),
                _transformProp   = _detectTransfrormProp(element),
                _elementHeight   = _gentleMe(_elementHeightImmediately, _options),
                _viewportHeight  = _gentleMe(_viewportHeightImmediately, _options, _.throttle),
                _getStickyHeightOverMe    = _gentleMe(_getStickyHeightOverMeImmediately, _options),
                _getStickyHeightUnderMe   = _gentleMe(_getStickyHeightUnderMeImmediately, _options),
                _getStickyCountOverMe     = _gentleMe(_getStickyCountOverMeImmediately, _options);

            var STICKY_CLASS     = 'sw-sticky-on',
                UNSTICKY_CLASS   = 'sw-sticky-off';

            /* --- init --- */

            element.on('$destroy', function _onElementDestroy()
            {
               swLayoutManager.unregister(id);
               if ( scroll )
               {
                  scroll.removeListener(_checkIfNeedSticky);
                  scroll.removeListener(_stick);
               }
               _unstick();
            });

            _.defer(_init);

            /* === impl === */

            function _init()
            {
               scroll = swScrollFactory.getParentScroll($(element)) || swApplicationScroll.getScroll();
               scroll = scroll === swApplicationScroll.getScroll() ? swApplicationScroll : scroll;

               if (_options.alwaysStick)
               {
                  _stick();
                  scroll.addListener(_stick);
               }
               else
               {
                  scroll.addListener(_checkIfNeedSticky);
               }

               _hasScroll = scroll.isVisible();

               swLayoutManager.register({
                  id    : id,
                  layout: layoutListener
               });
            }

            function layoutListener(context)
            {
               var e = context.events;

               var scrollVisibilityChanged = e.digest && (_hasScroll !== scroll.isVisible());
               var windowWidthChanged = e.resizing && (context.viewport.width !== context.oldViewport.width);

               if ( (windowWidthChanged || e.orienting || scrollVisibilityChanged) && _isStickyNow )
               {
                  // we have two-way dependency
                  // we need establish width of placeholder is equal width of element
                  // but we need refresh width of element when resizing window
                  // so the most easy way - restore element in DOM (in common context) and then change position to fixed again
                  _unstickElement();
                  _stickElement();
               }

               if ( e.resizing || e.orienting || e.digest )
               {
                  // TODO for digest: if 'StickyHeightOverMe' changed
                  _checkIfNeedSticky();
               }

               _hasScroll = scroll.isVisible();
            }

            function _getStickyHeightOverMeImmediately()
            {
               return swStickyService.getStickyHeightOver(_getScroll(), element);
            }

            function _getStickyHeightUnderMeImmediately()
            {
               return swStickyService.getStickyHeightUnder(_getScroll(), element);
            }

            function _getStickyCountOverMeImmediately()
            {
               return swStickyService.getStickyCountOver(_getScroll(), element);
            }

            function _getScrollTop() {
               var st = _.result(_getScroll(), '_getScrollTop');
               return _.isNumber(st) ? st : _.result(scroll, 'getScrollTop');
            }

            function _checkIfNeedSticky(scrollTop)
            {
               scrollTop = _.isNumber(scrollTop) ? scrollTop : _getScrollTop();

               // we don't need unstick if we overscroll on top on ipad
               // if we unstick when scroll top is negative, then our element have negative coordinate too
               if (scrollTop < 0)
               {
                  return;
               }

               scrollTop = scrollTop + _getStickyHeightOverMe();

               var contentTop    = Math.floor(content.offset().top),
                   contentBottom = Math.max(0, contentTop) + content.outerHeight(false);

               if (_options.alwaysStick || (scrollTop >= contentTop) && ( scrollTop < contentBottom))
               {
                  _stick();
               }
               else
               {
                  _unstick();
               }
            }

            function _stick()
            {
               if ( _isStickyNow )
               {
                  // already sticky, just monitor size changes
                  var css = _prepareStyles({});

                  if (_options.changeWidthOnScroll)
                  {
                     css.width = placeholder.outerWidth();
                  }
                  element.css(css);

                  placeholder.css(_cssForPlaceholder());
               }
               else
               {
                  _stickElement();
                  swStickyService.registry({
                     id     : id,
                     scroll : _getScroll(),
                     element: element,
                     isBottom: Boolean(_options.isBottom)
                  });
               }
            }

            function _cssForPlaceholder()
            {
               var height = _elementHeight();
               return {
                  height      : height,
                  minHeight   : height
               };
            }

            function _getScroll()
            {
               return  _.result(scroll, 'getScroll') || scroll;
            }

            function _stickElement()
            {
               _isStickyNow = true;

               logger.trace('stick');

               placeholder = $('<div>', {
                  css: _cssForPlaceholder()
               });

               element.addClass(STICKY_CLASS);
               element.removeClass(UNSTICKY_CLASS);

               var styles = {
                  position : 'fixed',
                  width    : _options.widthControl ? element.outerWidth() : '',
                  'z-index': 4000 - _getStickyCountOverMe() // magic number from vgre
               };

               styles = _prepareStyles(styles);

               element.css(styles);

               element.after(placeholder);
            }

            function _unstickElement()
            {
               _isStickyNow = false;

               logger.trace('unstick');

               element.addClass(UNSTICKY_CLASS);
               element.removeClass(STICKY_CLASS);

               var styles = {
                  top      : '',
                  position : '',
                  width    : '',
                  'z-index': '',
                  bottom   : ''
               };
               styles[_transformProp] = '';

               element.css(styles);

               if ( placeholder )
               {
                  placeholder.remove();
                  placeholder = null;
               }
            }

            function _viewportHeightImmediately()
            {
                return swLayoutManager.context().viewport.height;
            }

            function _elementHeightImmediately()
            {
               return element.outerHeight();
            }

            function _prepareStyles(styles)
            {
               var scrollTop = _getScrollTop();
               var top = _getStickyHeightOverMe();

               if ( scroll.isUseTransform() )
               {
                  if (_options.isBottom)
                  {
                    top = (_viewportHeight() - _elementHeight() - top);
                    styles.top = 0;
                  }
                  styles[_transformProp] = 'translateY(' + (scrollTop + top) + 'px)';
                  styles.position = 'absolute';
               }
               else
               {
                  if (_options.isBottom)
                  {
                     styles.bottom = _getStickyHeightUnderMe();
                  }
                  else
                  {
                     styles.top = top;
                  }
               }
               return styles;
            }

            function _unstick()
            {
               if ( !_isStickyNow )
               {
                  return;
               }

               _unstickElement();

               swStickyService.unregistry(id);
            }
         }
      };
   }]);

   function _gentleMe(fnc, _options, _wrapper)
   {
      _wrapper = _wrapper || _.debounce;
      var _lastResult = null;

      var _debounceWrapper = _wrapper(_ping, _options.debounceTime);

      return function _gentleMeCaller()
      {
         if ( _.isNumber(_lastResult) && _options.useGentle )
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

   var TRANSFORM_PROPS     = ['webkitTransform', 'MozTransform', 'OTransform', 'msTransform'];
   function _detectTransfrormProp($element)
   {
      return _.find(TRANSFORM_PROPS, _.property($element[0].style)) || 'transform';
   }
});
