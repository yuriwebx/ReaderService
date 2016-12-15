define([
   'module',
   'underscore',
   'Context',
   'swComponentFactory',
   'text!./ManagePublicationsToolbar.html',
   'less!./ManagePublicationsToolbar'
], function (module, _, Context, swComponentFactory, template) {
   "use strict";

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         unboldText : '&'
      },
      controller : [
         '$scope',
         'swPopupService',
         'swRecentBooksService',
         'swApplicationToolbarService',
         'swManagePublicationsToolbarService',
         'swPublicationsService',
         'swUnifiedSettingsService',
         'swSubmachine',
         'swI18nService',
         'swOfflineModeService',
         function (
            $scope,
            swPopupService,
            swRecentBooksService,
            swApplicationToolbarService,
            swManagePublicationsToolbarService,
            swPublicationsService,
            swUnifiedSettingsService,
            swSubmachine,
            swI18nService,
            swOfflineModeService) {

            var vm = $scope,
                isEditor = swApplicationToolbarService.isEditor();

            /* --- api --- */
            vm.swInit = _onInit;
            vm.swDestroy = _onDestroy;

            vm.extendapi = {currentPopUp : {}};
            vm.isEditor = isEditor;
            vm.isNight = Context.parameters.brand === 'FFA' ? 'night' : '';
            vm.resumeClass = 'Resume';

            vm.openLastOfRecentBooks = openLastOfRecentBooks;
            vm.toggleReadModeSearch = toggleReadModeSearch;
            vm.isResumeVisible = isResumeVisible;
            vm.isExplore = isExplore;
            vm.isOffline = !swOfflineModeService.isOfflineModeEnabled() && swOfflineModeService.isOffline();

            vm.getTitleRecentItem = getTitleRecentItem;
            vm.getAuthorRecentItem = getAuthorRecentItem;
            vm.openLastBooksList = openLastBooksList;
            vm.onResizeElement = onResizeElement;
            vm.getLocalizeName = getLocalizeName;
            /* === impl === */

            function _onInit () {
               swOfflineModeService.addOnlineModeChangeListener(onOnlineStateChange);
            }

            function _onDestroy () {
               swOfflineModeService.removeOnlineModeChangeListener(onOnlineStateChange);
            }

            function getState(){
               return swSubmachine.getStack().length && swSubmachine.getStack()[0].currState;
            }

            swManagePublicationsToolbarService.setSetShowPopupFn(toggleReadModeSearch);

            function openLastOfRecentBooks() {
               var lastRecentItem = swRecentBooksService.getLastRecentItem();
               swRecentBooksService.openRecentBook(lastRecentItem);
            }

            function toggleReadModeSearch($event){
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
            }

            function isResumeVisible() {
               return Object.keys(swRecentBooksService.getLastRecentItem()).length;
            }

            function isExplore() {
               return getState() === 'Explore';
            }

            function showPopup(options) {
               options = _.extend(options || {}, {
                  backdropVisible: true
               });
               $scope.extendapi.currentPopUp = swPopupService.show(options);
               return $scope.extendapi.currentPopUp.promise;
            }

            // Recent items
            function getTitleRecentItem() {
               return swRecentBooksService.getRecentItemInfo('name');
            }

            function getAuthorRecentItem() {
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
            }

            function openLastBooksList ($event) {
               swRecentBooksService.showPopup($event.target);
            }

            function onResizeElement(size) {
               swRecentBooksService.hideAuthorBySizeElement('#last-recent-book-manage-publication', size.width, size.height);
            }

            function getLocalizeName() {
               vm.resumeClass = 'Resume';
               var resource = "LibraryToolbar.ResumeReading.label";
               var lastRecentItem = swRecentBooksService.getLastRecentItem();
               if (isEditor) {
                  resource = "LibraryToolbar.ResumeEditing.label";
               }
               else if (lastRecentItem.type === "StudyClass") {
                  vm.resumeClass = 'ResumeStudy';
                  resource = "LibraryToolbar.ResumeStudy.label";
               }
               return swI18nService.getResource(resource);
            }

            function onOnlineStateChange (online) {
               vm.isOffline = !swOfflineModeService.isOfflineModeEnabled() && !online;
            }
         }]
   });
});
