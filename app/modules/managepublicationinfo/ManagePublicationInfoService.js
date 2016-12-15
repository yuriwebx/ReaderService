define([
   'module',
   'swServiceFactory',
   'text!./ManagePublicationInfo-header.html'
], function ( module, swServiceFactory, headerTemplate ) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         'swPopupService',
         '$rootScope',
         function ( swPopupService, $rootScope ) {
            var infoPopup;
            var vm = $rootScope.$new();

            vm.config = {};

            this.openInfoPopup = function ( _publication ) {
               vm.config.publication = _publication || {};
               vm.config.closeInfoPopup = closeInfoPopup;

               if (!infoPopup || infoPopup.isHidden()) {
                  vm.swScrollOptions = {type: 'NONE'};
                  infoPopup = swPopupService.show({
                     content         : '<sw-manage-publication-info config="config"></sw-manage-publication-info>',
                     header          : headerTemplate,
                     scope           : vm,
                     backdropVisible : true,
                     customClass     : 'manage-publication-info-popup defaultPopup',
                     layout          : {
                        my: 'CC'
                     }
                  });
               }
            };

            function closeInfoPopup () {
               if ( infoPopup ) {
                  infoPopup.hide();
               }
            }
         }]
   });
});