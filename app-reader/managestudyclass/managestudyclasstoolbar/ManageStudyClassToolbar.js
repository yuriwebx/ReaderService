define([
   'module',
   'underscore',
   'Context',
   'swComponentFactory',
   'text!./ManageStudyClassToolbar.html',
   'less!./ManageStudyClassToolbar.less',
   'less!./ManageStudyClassToolbarThemeMixin.less'
], function (module, _, Context, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         appToolbarParams  : '=',
         unboldText        : '&'
      },
      controller: [
         '$scope',
         'swPopupService',
         'swManageStudyClassToolbarService',
         'swSubmachine',
         'swApplicationToolbarService',
         'swRecentBooksService',
         'swI18nService',
         'swPublicationsService',
         'swUnifiedSettingsService',
         function ($scope,
                   swPopupService,
                   swManageStudyClassToolbarService,
                   swSubmachine,
                   swApplicationToolbarService,
                   swRecentBooksService,
                   swI18nService,
                   swPublicationsService,
                   swUnifiedSettingsService) {

            $scope.isEditor = swApplicationToolbarService.isEditor();

            $scope.configInfo = Context.parameters;
            $scope.isNight =  $scope.configInfo.brand === 'FFA' ? 'night' : '';

            $scope.swInit = function ()
            {

            };
            

            $scope.getLocalizeName = function(button) {
               var resource = "LibraryToolbar." + button + ".label";
               if (button === 'ResumeStudy') {
                  var studyLabel = "LibraryToolbar.Study.label";
                  var resumeStudyLabel = "LibraryToolbar.ResumeStudy.label";
                  var lastRecentItem = swRecentBooksService.getLastRecentItem();
                   resource = lastRecentItem.type === "StudyClass" && lastRecentItem.progress > 0 ? resumeStudyLabel : studyLabel;
               }
               return swI18nService.getResource(resource);
            };
            /*$scope.toggleMenu = function ()
            {
               showPopup({
                  scope    : $scope,
                  template : '<sw-read-mode-settings-menu></sw-read-mode-settings-menu>'
               });
            };*/
            $scope.extendapi = {currentPopUp : {}};
            $scope.toggleReadModeSearch = function ($event)
            {
               var clientRect = $event.target.getClientRects()[0];
               clientRect = {
                  top      : clientRect.bottom,
                  height   : clientRect.height
               };

               showPopup({
                  layout : {
                     margin: {
                        top: 60
                     },
                     of : {
                        clientRect: clientRect
                     }
                  },
                  scope : $scope,
                  template    : '<sw-read-mode-search extendapi="extendapi"></sw-read-mode-search>'
               }).then(function() {
                  $scope.unboldText();
               });
            };

            $scope.buttons = swManageStudyClassToolbarService.getButtons();

            $scope.buttonsRequired = function (buttonName)
            {
               return swManageStudyClassToolbarService.getButtonRequired(buttonName);
            };

            $scope.setButtonDeepLink = function (buttonName)
            {
               var deeplink = swManageStudyClassToolbarService.getButtonDeepLink(buttonName);

               if (deeplink) {
                  swSubmachine.deeplink(deeplink);
               }
            };

            function showPopup(options) {
               var opts = _.defaults({
                  backdropVisible: true
               }, options);
               $scope.extendapi.currentPopUp = swPopupService.show(opts);
               return $scope.extendapi.currentPopUp.promise;
            }

            // Recent items
            $scope.getRecentItemTitle = function () {
               return swRecentBooksService.getRecentItemInfo('name');
            };

            $scope.getRecentItemAuthor = function(){
               var lastRecentItem = swRecentBooksService.getLastRecentItem();
               if (lastRecentItem.type === 'StudyClass') {
                  return '';
               }
               var author = swRecentBooksService.getRecentItemInfo('author'),
                  title = swRecentBooksService.getRecentItemInfo('name'),
                  currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
               if (!swPublicationsService.isAuthorInBookTitle(author, title, currentLanguage)) {
                  return ', ' + swRecentBooksService.getRecentItemInfo('author');
               }
            };

            $scope.openLastBooksList = function ($event)
            {
               swRecentBooksService.showPopup($event.target);
            };

            $scope.onResizeElement = function(size) {
               swRecentBooksService.hideAuthorBySizeElement('#last-recent-book-study-class', size.width, size.height);
            };

         }]
   });
});