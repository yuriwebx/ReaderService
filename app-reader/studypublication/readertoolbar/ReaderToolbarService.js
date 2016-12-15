define([
   'module',
   'swServiceFactory'
], function(module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : ['swPopupService',
         function(swPopupService) {
         var listeners = [],
             isLibraryButtonVisible,
             _buttons,
             _buttonsVisibility,
             _buttonsDeeplinkMap,
             onClassInfoFn;

         isLibraryButtonVisible = true;

         _buttons = [
            'Library'
         ];

         _buttonsVisibility = {
            'Library'      : isLibraryButtonVisible
         };

         _buttonsDeeplinkMap = {
            'Library'      : '/managepublications'
         };

         this.getButtons = function()
         {
            return _buttons;
         };
         
         this.addOnExtrasToggleListener = function(_listener)
         {
            listeners.push(_listener);
         };
         
         this.removeOnExtrasToggleListener = function(listener)
         {
            for (var i = 0; i < listeners.length; ++i)
            {
               if (listeners[i] === listener)
               {
                  listeners.splice(i, 1);
                  return;
               }
            }
         };

         this.onExtrasToggle = function(params)
         {
            this.logger.debug('extras toggled');
            for (var i = 0; i < listeners.length; ++i)
            {
               listeners[i](params);
            }
         };

         this.showSettingsPopup = function($event) {
            var popup;
            var layout = {
               margin: {
                  top: 44
               },
               my: 'CB'
            };

            if ($event) {
               var element = $event.target;

               layout = {
                  my: 'CT',
                  at: 'CB',
                  of: element,
                  arrow: true
               };
            }

            var opts = {
               template: '<sw-read-mode-settings-menu></sw-read-mode-settings-menu>',
               customClass: 'read-mode-settings-popup',
               layout: layout
            };
            popup = swPopupService.show(opts);
            return popup;
         };

         this.getButtonRequired = function(buttonName)
         {
            return _buttonsVisibility[buttonName];
         };

         this.getButtonDeepLink = function(buttonName)
         {
            return _buttonsDeeplinkMap[buttonName];
         };

         this.setOpenClassInfoFn = function (fn)
         {
            onClassInfoFn = fn;
         };

         this.openClassInfo = function ()
         {
            if (typeof onClassInfoFn === 'function')
            {
               onClassInfoFn();
            }
         };
      }]
   });
});