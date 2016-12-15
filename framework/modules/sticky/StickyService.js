define([

   'module',
   'underscore',
   'swServiceFactory'

   ], function(

   module,
   _,
   swServiceFactory

   ){

   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         function()
      {

         /* --- api --- */
         this.registry     = registry;
         this.unregistry   = unregistry;

         this.getStickyHeightOver   = getStickyHeightOver;
         this.getStickyHeightUnder  = getStickyHeightUnder;
         this.getStickyCountOver    = getStickyCountOver;


         /* === impl === */
         var _list = [];

         function registry(data)
         {
            _list.push(data);
         }

         function unregistry(id)
         {
            _.remove(_list, function _removePredicate(data)
            {
               return data.id === id;
            });
         }

         function _filterByScroll(scroll, isBottom)
         {
            var parent = _elementByScroll(scroll);
            return _.filter(_list, function(data)
            {
               return _elementByScroll(data.scroll) === parent && data.isBottom === isBottom;
            });
         }

         function _elementByScroll(scroll)
         {
            return (scroll && scroll._$elem) ? scroll._$elem[0] : null;
         }

         function _processSticktOver(scroll, element, it, isBottom)
         {
            var _list = _filterByScroll(scroll, isBottom);
            _.every(_list, function(data)
            {
               var h = data.element;
               if (h === element)
               {
                  return false;
               }
               it(h);
               return true;
            });
         }

         function getStickyHeight(scroll, element, isBottom)
         {
            var offset = 0;

            _processSticktOver(scroll, element, function(h)
            {
               offset += h.outerHeight(false);
            }, isBottom);

            return offset;
         }

         function getStickyHeightOver(scroll, element)
         {
            return getStickyHeight(scroll, element, false);
         }

         function getStickyHeightUnder(scroll, element)
         {
            return getStickyHeight(scroll, element, true);
         }

         function getStickyCountOver(scroll, element)
         {
            var count = 0;

            _processSticktOver(scroll, element, function()
            {
               count += 1;
            }, false);

            return count;
         }
      }]
   });
});
