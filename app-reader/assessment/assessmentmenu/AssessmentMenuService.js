define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         '$rootScope',
         function (swPopupService, $rootScope) {
            var assessmentsMenu;
            var scope = $rootScope.$new();

            this.toggleAssessmentMenu = function (element, data) {
               var popupConfig;
               scope.data = data || {};
               if (!assessmentsMenu || assessmentsMenu.isHidden()) {
                  popupConfig = {
                     template: '<sw-assessment-menu data="data"></sw-assessment-menu>',
                     backdropVisible: true,
                     scope: scope,
                     customClass: 'assessment-menu-popup-dialog',
                     layout: getLayouter(element)
                  };

                  assessmentsMenu = swPopupService.show(popupConfig);
               }
               return assessmentsMenu;
            };

            this.showPopup = function() {
               var popupConfig = {
                  customClass: 'modal-popup',
                  template: '<sw-assessment-menu></sw-assessment-menu>',
                  layout: {},
                  backdropVisible: true,
                  modal: false
               };

               return swPopupService.show(popupConfig);
            };

            function getLayouter(element) {
               return function() {
                  return {
                     of: {
                        clientRect: element.getClientRects()[0]
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