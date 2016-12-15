define([

   'underscore',
   'swComponentFactory',
   'module',
   'text!./RecentBooksToolbar.html',
   'less!./RecentBooksToolbar'

   ], function(

   _,
   swComponentFactory,
   module,
   template

   ){

   'use strict';

   swComponentFactory.create({
      module   : module,
      template : template,
      controller: [
         '$scope',
         'swLayoutManager',
         'swRecentBooksService',
         'swPublicationsService',
         'swUnifiedSettingsService',
         'swApplicationToolbarService',

         function (
            $scope,
            swLayoutManager,
            swRecentBooksService,
            swPublicationsService,
            swUnifiedSettingsService,
            swApplicationToolbarService
         )
      {

         var vm = $scope,
             isEditor = swApplicationToolbarService.isEditor();

         /* --- api --- */
         vm.books    = [];
         vm.openPublication   = openPublication;
         vm.isStudyCourse     = isStudyCourse;
         vm.isVisible         = false;
         vm.getThumbnailByPublication = getThumbnailByPublication;

         /* === impl === */
         $scope.swInit     = swInit;
         $scope.swDestroy  = swDestroy;

         swRecentBooksService.getRemoteRecentBooks().then(function _onLoadRecentBook(data) {
            vm.books = data.books;
            checkVisibility();
         });

         function getThumbnailByPublication(publication) {
            return swPublicationsService.getCoverPath(publication, 'large');
         }

         function swInit() {
            swLayoutManager.register({
               id       : $scope.$id,
               layout   : _layout
            });
            swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedFilter', checkVisibility);
            swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedMode', checkVisibility);
         }

         function swDestroy() {
            swLayoutManager.unregister($scope.$id);
            swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedFilter', checkVisibility);
            swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedMode', checkVisibility);
         }

         function openPublication(publication) {
            swRecentBooksService.openRecentBook(publication);
         }

         function isStudyCourse(item){
            return item.type === 'StudyCourse' || (item.type.replace(/\s/g,'') === 'StudyClass'/* && !item.coverId*/);
         }

         function _aLotOfBooks() {
            return (vm.books || []).length > 6;
         }

         function _isWide() {
            return swLayoutManager.context().viewport.width > 1023;
         }

         function _isNoSearch() {
            var text = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedFilter');
            return !text;
         }

         function _isNotStudyTab() {
            var mode = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedMode');
            return (!mode || _.has(mode, 'personalPublications'));
         }

         function _layout(ctx) {
            var e = ctx.events;
            if (e.resizing || e.orienting || e.scrolling) {
               checkVisibility();
            }
         }

         function checkVisibility() {
            $scope.$evalAsync(function() {
               vm.isVisible = _aLotOfBooks() && _isWide() && _isNoSearch() && _isNotStudyTab() && !isEditor;
            });
         }
      }]
   });
});
