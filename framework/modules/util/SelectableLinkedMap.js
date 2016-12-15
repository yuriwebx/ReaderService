/**
 * Collection of objects that have 'id' and 'selected' properties.
 * - Ensures fast 'byId' access.
 * - Keeps the order in which the objects are added.
 */
define(
   [
    
    'module',
    'underscore',
    'ngModule',
    'swLoggerFactory'
    
    ],
function
   (
         
     module,
     _,
     ngModule,
     swLoggerFactory
     
   )
{
   'use strict';
      
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.factory('swSelectableLinkedMap', [function()
   {
      logger.trace('register');

      function SelectableLinkedMap()
      {
         var map = {};  // ensures fast 'byId' access
         var list = []; // keeps the order in which the objects are added
         
         /*
          * If item.selected is 'true'  then item is added.
          * If item.selected is 'false' then item is removed.
          */
         this.update = function(item)
         {
            remove(item);
            
            if ( item.selected )
            {
               map[item.id] = item;
               list.push(item);
            }
         };
         
         this.getById = function(item)
         {
            return map[item.id];
         };
         
         this.list = function()
         {
            return list;
         };
         
         function remove(item)
         {
            if ( _.has(map, item.id) )
            {
               delete map[item.id];
               for ( var i = 0; i < list.length; i++ )
               {
                  if ( item.id === list[i].id )
                  {
                     list.splice(i, 1);
                     return;
                  }
               }
               throw new Error('SelectableLinkedMap.remove: internal error');
            }
         }
      }
      
      // public static
      SelectableLinkedMap.createInstance = function()
      {
         return new SelectableLinkedMap();
      };
      
      return SelectableLinkedMap;
   
   }]);

});
