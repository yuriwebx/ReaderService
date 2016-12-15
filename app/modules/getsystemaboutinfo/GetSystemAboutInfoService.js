define([
   'module',
   'swServiceFactory',
   'text!./GetSystemAboutInfoHeader.html',
   'less!./GetSystemAboutInfo.less'
], function(module, swServiceFactory, templateHeader) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : ['swPopupService', '$rootScope', function(swPopupService, $rootScope) {

        this.showAboutPopup = function () {
            var popup, $scope = $rootScope.$new();
			/* jshint ignore:start */
            $scope.closePopup = function(){popup && popup.hide()};
			/* jshint ignore:end */
            popup = swPopupService.show({
                  layout: {},
                  customClass: 'popup-about defaultPopup',
                  scope: $scope,
                  header: templateHeader,
                  content: '<sw-get-system-about-info></sw-get-system-about-info>',
                  backdropVisible: true,
                  modal: false
               });
            
         };
      }]
   
   });
});