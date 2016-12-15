/**
 * @description Simple factory for create scroller.
 * @see AbstractScroll
 *
 * API:
 *
 *    getSupportedTypes()
 *       - array of supported scroll types
 *
 *    createScroll(type, elem)
 *       - create scroll for some element. For Scroll API see AbstractScroll.js
 *       "type"   : one of supported scroll types
 *       "elem"   : jquery wrapper for scrolling element
 *
 *    getParentScroll(elem)
 *       - get scroll who contains elem
 *       "elem"   : node element or jquery wrapper for it
 *
 *    scrollIntoView(element, alignToTop)
 *       - scroll into element
 *       "elem"   : node element or jquery wrapper for it
 *       "alignToTop" : if `false` the bottom of the element will be aligned to the bottom of the visible area of the scrollable ancestor
 *
 *    scrollIntoViewIfNeeded(element, alignToTop)
 *       - scroll into element if needed
 *       "elem"   : node element or jquery wrapper for it
 *       "alignToTop" : if `false` the bottom of the element will be aligned to the bottom of the visible area of the scrollable ancestor
 *
 */
define([
   'module',
   'swServiceFactory',
   'underscore',
   'jquery'
], function (module, swServiceFactory, _, $) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         '$window',
         'swStandardScroll',
         'swVirtualScroll',
         'swBaronScroll',
         'swNoneScroll',
         function(

            $window,
            swStandardScroll,
            swVirtualScroll,
            swBaronScroll,
            swNoneScroll

            ) {

         /* --- api --- */
         this.createScroll       = createScroll;
         this.getScroll          = getScroll;
         this.getParentScroll    = getParentScroll;
         this.getSupportedTypes  = getSupportedTypes;
         this.scrollIntoView     = scrollIntoView;
         this.scrollIntoViewIfNeeded   = scrollIntoViewIfNeeded;

         /* === impl === */
         this._configure         = _configure;

         var _default = {
            type     : 'STANDARD',
            elem     : $window,
            options  : {
               baron    : false,
               autowrap : true
            }
         };

         var NAME_DATA = 'sw-scroll-data';
         var CLASS_NAME = 'sw-custom-scroll';

         function _configure(config)
         {
            _.extend(_default, config);
            // you need recreate swApplicationScroll manually after that
         }

         function createScroll(type, elem, options)
         {
            var data = _.defaults({
               type     : type,
               elem     : elem,
               options  : {}
            }, _default);

            var $elem = $(data.elem);

            _.extend(data.options, _default.options, options);

            if (data.options.innerScroll)
            {
               data.options.parentScroll = getParentScroll($elem.parent());
            }

            var Scroll = _detectScroll(data);

            var scroll = new Scroll($elem, data.options);

            $elem = $elem[0] === $window ? $('body') : $elem;

            $elem.data(NAME_DATA, scroll);
            $elem.toggleClass(CLASS_NAME, true);
            scroll._$elem = $elem;

            return scroll;
         }

         function getScroll(elem)
         {
            return $(elem).data(NAME_DATA);
         }

         function getParentScroll(elem)
         {
            var $el = $(elem).closest('.' + CLASS_NAME);
            return getScroll($el.length > 0 ? $el : $($window));
         }

         function scrollIntoView(elem, alignToTop)
         {
            return _safeScrolling('scrollIntoView', elem, alignToTop);
         }

         function scrollIntoViewIfNeeded(elem, alignToTop)
         {
            return _safeScrolling('scrollIntoViewIfNeeded', elem, alignToTop);
         }

         function _safeScrolling(fnc, elem, alignToTop)
         {
            var $elem = $(elem);
            if ( $window.document.body.contains($elem[0]) )
            {
               var scroll = getParentScroll($elem);

               if ( scroll )
               {
                  return scroll[fnc](elem, alignToTop);
               }
            }
         }

         function _detectScroll(data)
         {
            if (data.type === 'VIRTUAL')
            {
               return swVirtualScroll;
            }
            else if (data.type === 'NONE')
            {
               return swNoneScroll;
            }
            else if (data.type === 'STANDARD')
            {
               return data.options.baron ? swBaronScroll : swStandardScroll;
            }
            else
            {
               throw new Error('Unsupported scroll type "' + data.type + '"');
            }
         }

         function getSupportedTypes()
         {
            return ['STANDARD', 'VIRTUAL', 'NONE'];
         }
      }]
   });
});
