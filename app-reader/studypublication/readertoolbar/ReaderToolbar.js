define([
   'module',
   'swAppUrl',
   'underscore',
   'Context',
   'swComponentFactory',
   'text!./ReaderToolbar.html',
   'less!./ReaderToolbar.less',
   'less!./ReaderToolbarThemeMixin.less'
], function (module, swAppUrl, _, Context, swComponentFactory, template) {
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
         'swReaderToolbarService',
         'swSubmachine',
         'swApplicationToolbarService',
         'swRecentBooksService',
         '$timeout',
         'swLayoutManager',
         'swPublicationsService',
         'swUnifiedSettingsService',
         'swApplicationScroll',
         'swOfflineModeService',
         'swPublicationAudioManager',
         'swContentProvider',
         function (
            $scope,
            swPopupService,
            swReaderToolbarService,
            swSubmachine,
            swApplicationToolbarService,
            swRecentBooksService,
            $timeout,
            swLayoutManager,
            swPublicationsService,
            swUnifiedSettingsService,
            swApplicationScroll,
            swOfflineModeService,
            swPublicationAudioManager,
            swContentProvider
         ) {

            $scope.extendapi = {currentPopUp : {}};

            $scope.configInfo = Context.parameters;
            $scope.isNight =  $scope.configInfo.brand === 'FFA' ? 'night' : '';
            $scope.isEditor = swApplicationToolbarService.isEditor();
            $scope.isOffline = !swOfflineModeService.isOfflineModeEnabled() && swOfflineModeService.isOffline();
            $scope.isStudyClass = function () {
               return swRecentBooksService.getRecentItemInfo('type') === 'StudyClass';
            };
            $scope.isToolbarHidden = false;

            var isFromClassEntered = false;

            $scope.swInit = function () {
               getButtonsVisibility();
               swApplicationScroll.addListener(_onScroll);
               swOfflineModeService.addOnlineModeChangeListener(onOnlineStateChange);
               swApplicationToolbarService.addOnApplicationToolbarToggleListener(toggleToolbarVisibility);
            };

            $scope.swDestroy = function() {
               swApplicationScroll.removeListener(_onScroll);
               swOfflineModeService.removeOnlineModeChangeListener(onOnlineStateChange);
               swApplicationToolbarService.removeOnApplicationToolbarToggleListener(toggleToolbarVisibility);
            };

            $scope.swLayout = function () {
               getButtonsVisibility();
            };

            $scope.isFromClassEntered = function(){
               isFromClassEntered = swApplicationToolbarService.isFromClassEntered();
               return isFromClassEntered;
            };

            $scope.toggleMenu = function ($event)
            {
               swPublicationAudioManager.pause();
               showPopup({
                  scope    : $scope,
                  template : '<sw-read-mode-settings-menu></sw-read-mode-settings-menu>',
                  customClass: 'read-mode-settings-popup',
                  layout: getLayouter($event.currentTarget)
               });
            };

            $scope.BookInfoTooltip = {
               text: 'ApplicationMenuItem.BookInfo.tooltip',
               layout: {
                  my: 'CT',
                  at: 'CB',
                  margin: 10,
                  collision: {rotate: false}
               }
            };

            $scope.SearchTooltip = {
               text: 'ApplicationMenuItem.Search.tooltip',
               layout: {
                  my: 'CT',
                  at: 'CB',
                  margin: 10,
                  collision: {rotate: false}
               }
            };

            function getLayouter(elem) {
               return function() {
                  return {
                     arrow: true,
                     my: 'CT',
                     at: 'CB',
                     of: {
                        clientRect: elem.getClientRects()[0]
                     }
                  };
               };
            }

            $scope.toggleBookExtras = function(event)
            {
               swPublicationAudioManager.pause();
               swReaderToolbarService.onExtrasToggle({visible: true, element: event.target, fromClass: isFromClassEntered});
            };

            $scope.toggleReadModeSearch = function ($event)
            {
               swPublicationAudioManager.pause();

               var clientRect = $event.target.getClientRects()[0];
               clientRect = {
                  top      : clientRect.top,
                  height   : clientRect.height
               };

               showPopup({
                  layout : {
                     margin: {
                        top: 64
                     },
                     of : {
                        clientRect: clientRect
                     }
                  },
                  scope :  $scope,
                  template    : '<sw-read-mode-search extendapi="extendapi"></sw-read-mode-search>'
               }).then(function() {
                  $scope.unboldText();
               });
            };

            $scope.buttons = swReaderToolbarService.getButtons();

            $scope.buttonsRequired = function (buttonName)
            {
               return swReaderToolbarService.getButtonRequired(buttonName);
            };

            $scope.setButtonDeepLink = function (buttonName, event)
            {
               var deeplink = swReaderToolbarService.getButtonDeepLink(buttonName),
                   timer;

               if (deeplink) {
                  $timeout.cancel(timer);

                  if ( event.ctrlKey )
                  {
                     $scope.buttonLink = swAppUrl.withoutFragment + '#' + deeplink;
                     $scope.target = '_blank';

                     timer = $timeout(function(){
                        $scope.buttonLink = '';
                        $scope.target = '_self';
                     });
                     return;
                  }

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

            function toggleToolbarVisibility(hidden) {
               $scope.isToolbarHidden = hidden;
            }

            // Recent items
            $scope.getRecentItemTitle = function ()
            {
               var name;
               if ($scope.isToolbarHidden && $scope.isStudyClass()) {
                  var details = swContentProvider.getDetails();
                  if (details) {
                     name = details.name;
                  }
               }
               else {
                  name = swRecentBooksService.getRecentItemInfo('name');
               }
               return name;
            };

            $scope.getRecentItemAuthor = function ()
            {
               var lastRecentItem = swRecentBooksService.getLastRecentItem();
               var author = lastRecentItem.author,
                  title = lastRecentItem.name,
                  currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
               if ($scope.isToolbarHidden && $scope.isStudyClass()) {
                  var details = swContentProvider.getDetails();
                  if (details) {
                     return ', ' + details.author;
                  }
               }
               if (!$scope.isStudyClass() && !swPublicationsService.isAuthorInBookTitle(author, title, currentLanguage)) {
                  return ', ' + lastRecentItem.author;
               }
               return '';
            };

            $scope.openLastBooksList = function ($event) {
               swPublicationAudioManager.pause();
               swRecentBooksService.showPopup($event.target);
            };

            $scope.openClassInfo = function ()
            {
               swPublicationAudioManager.pause();
               swReaderToolbarService.openClassInfo();
            };

            $scope.isDevelopStudyCourse = function(){
               return getState() === 'DevelopStudyCourse';
            };

            function getState(){
               return swSubmachine.getStack().length && swSubmachine.getStack()[0].currState;
            }

            $scope.onResizeElement = function(size) {
               swRecentBooksService.hideAuthorBySizeElement('#last-recent-book-reader', size.width, size.height);
            };

            function getButtonsVisibility () {
               $scope.isWideMedia = !!swLayoutManager.context().media.wide;
               $scope.isExtrasBtn = getState() === 'Reading' && (!$scope.isEditor && $scope.isWideMedia || !$scope.isWideMedia);
            }

            function _onScroll() {
               var popup = _.result($scope, 'extendapi.currentPopUp');
               if (_.result(popup, 'isHidden') === false) {
                  popup.layoutImmediately();
               }
            }

            function onOnlineStateChange (online) {
               $scope.isOffline = !swOfflineModeService.isOfflineModeEnabled() && !online;
            }
         }]
   });
});
