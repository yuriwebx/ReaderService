define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         'swPublicationAudioManager',
         function (swPopupService, swPublicationAudioManager) {
            var messageMenu;

            this.toggleMessageMenu = function (elem) {
               swPublicationAudioManager.pause();
               var popupConfig;
               if (!messageMenu || messageMenu.isHidden()) {
                  popupConfig = {
                     template: '<sw-personal-messages-menu></sw-sw-personal-messages-menu>',
                     backdropVisible: true,
                     customClass: 'message-popup-dialog',
                     layout: getLayouter(elem),
                     modal: false
                  };
                  messageMenu = swPopupService.show(popupConfig);
               }
               return messageMenu;
            };

            this.showPopup = function() {
               var popupConfig = {
                  customClass: 'modal-popup',
                  template: '<sw-personal-messages-menu></sw-sw-personal-messages-menu>',
                  layout: {},
                  backdropVisible: true,
                  modal: false
               };

               return swPopupService.show(popupConfig);
            };

            function getLayouter(elem) {
               return function() {
                  return {
                     of: {
                        clientRect: elem.getClientRects()[0]
                     },
                     my: 'RT',
                     at: 'RB',
                     arrow: true
                  };
               };
            }
            
         }
      ]
   });
});
