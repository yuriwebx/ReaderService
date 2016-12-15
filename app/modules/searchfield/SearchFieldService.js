define(['module', 'swServiceFactory'], function(module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : [function() {
         
         var listeners = [], searchText;
         
         this.onSearchFieldChanged = function(value)
         {
            searchText = value;
            for (var i = 0; i < listeners.length; ++i)
            {
               listeners[i].apply(null, [value]);
            }
         };
         
         this.addOnSearchFieldChangeListener = function(listener)
         {
            listeners.push(listener);
         };
         
         this.removeOnSearchFieldChangeListener = function(listener)
         {
            for (var i = 0; i < listeners.length; ++i)
            {
               if (listeners[i] === listener)
               {
                  listeners.splice(i, 1);
               }
            }
         };

         var hotKeyListener;

         this.onKeyPressed = function(value)
         {
            if (typeof hotKeyListener === 'function') {
               hotKeyListener.apply(null, [value]);
            }
         };

         this.addOnKeyPressedListener = function(listener)
         {
            hotKeyListener = listener;
         };

         this.removeOnKeyPressedListener = function()
         {
            hotKeyListener = null;
         };

         var focusRestoreListener;

         this.onFocusRestore = function(value)
         {
            if (typeof focusRestoreListener === 'function') {
               focusRestoreListener.apply(null, [value]);
            }
         };

         this.addFocusRestoreListener = function(listener)
         {
            focusRestoreListener = listener;
         };

         this.removeFocusRestoreListener = function()
         {
            focusRestoreListener = null;
         };
         
         this.getSearchText = function()
         {
            return searchText;
         };
         
         this.setSearchText = function(_searchText)
         {
            searchText = _searchText;
         };
         
         this.getComparator = function()
         {
            return function contains(value, filterValue)
            {
               if (!filterValue)
               {
                  return true;
               }
               return value && value.toLowerCase().indexOf(filterValue.toLowerCase()) !== -1;
            };
         };
      }]
   });
});