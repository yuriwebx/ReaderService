/**


 <ELEM sw-on-element-resize="myfunction(size, oldSize)">


 */

define([
   'module',
   'ngModule',
   'underscore',
   'swLoggerFactory'
], function (module, ngModule, _, swLoggerFactory)
{
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   var dirName = 'swOnElementResize';

   ngModule.directive(dirName, ['$parse', 'swLayoutManager', function ($parse, swLayoutManager)
   {
      var _cache = {};

      function _checkElSize(context)
      {
         if (context.events.resizing || context.events.orienting || context.events.digest)
         {
            _.each(_cache, function (item)
            {
               if (item.width !== item.element.offsetWidth || item.height !== item.element.offsetHeight)
               {
                  var oldWidth = item.width;
                  var oldHeight = item.height;
                  item.width = item.element.offsetWidth;
                  item.height = item.element.offsetHeight;
                  item.listener(item.scope, {
                     size: {width: item.width, height: item.height}, oldSize: {width: oldWidth, height: oldHeight}
                  });
               }
            });
         }
      }

      swLayoutManager.register({
         layout: _checkElSize,
         id: 'ElementResize'
      });

      return {
         restrict: 'A',
         link: function (scope, el, attr)
         {
            var id = _.uniqueId();

            _cache[id] = {
               element: el[0],
               listener: $parse(attr[dirName]),
               scope: scope
            };

            el.on('$destroy', function ()
            {
               delete _cache[id];
            });
         }
      };
   }]);

});