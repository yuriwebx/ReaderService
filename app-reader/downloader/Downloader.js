define([
   'swComponentFactory',
   'module',
   'text!./Downloader.html',
   'text!./DownloaderContextMenu.html',
   'less!./Downloader'
], function (swComponentFactory, module, template, templateContext) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope : {
         downloadInfo: '='
      },
      controller: [
         'swPopupService',
         'swDownloadManager',
         '$scope',
         '$timeout',
         function (
            swPopupService,
            swDownloadManager,
            $scope,
            $timeout
         ) {
            var vm = $scope;
            var contextPopup;
            vm.contextMenuList = [];

            vm.swInit         = _init;
            vm.showContext    = showContext;
            vm.onItemClick    = onItemClick;
            vm.onAudioClick   = onAudioClick;
            vm.isAudioOutdated = isAudioOutdated;

            function _init () {
               vm.item = swDownloadManager.get(getItemId(vm.downloadInfo));
               vm.info = {};

               vm.info.audio     = Boolean(vm.downloadInfo.audio);
               vm.info.name      = vm.downloadInfo.name;
               vm.info.mediaSize = (vm.downloadInfo.mediaSize / (1024 * 1024)).toFixed(2);

               vm.info.inProgress      = false;
               vm.info.audioInProgress = false;
            }

            function showContext (_ev) {
               var _element = _ev.target;
               if ( !contextPopup || contextPopup.isHidden() ) {
                  contextPopup = swPopupService.show({
                     target          : _element,
                     layout          : {
                                        arrow : true,
                                        my    : 'LT',
                                        at    : 'CB',
                                        of: {
                                           clientRect: _element.getClientRects()[0]
                                        }
                                     },
                     customClass     : 'downloader-context-menu-popup',
                     scope           : $scope,
                     template        : templateContext,
                     backdropVisible : false
                  });
               }
            }

            function onItemClick (item) {
               function _updateView () {
                  vm.info.inProgress = false;
                  $timeout();
               }
               vm.info.inProgress = true;
               return item[item.isDownloaded ? 'removeBook' : 'downloadBook']().finally(_updateView); //.catch();
            }

            function onAudioClick (item) {
               var result = null;
               function _updateView () {
                  vm.info.audioInProgress = false;
                  $timeout();
               }
               vm.info.audioInProgress = true;
               if (item.isAudioDownloaded) {
                  result = item.removeAudio();
               }
               else if (item.isDownloaded) {
                  result = item.downloadAudio();
               }
               else {
                  result = onItemClick(item)
                     .then(function () {
                        return item.downloadAudio();
                     });
               }
               return result.finally(_updateView);
            }

            function isAudioOutdated (item) {
               return item.content.outdated || item.audio.outdated || item.alignment.outdated;
            }

            function getItemId (publication) {
               return publication.bookId || // syllabus item in class
                  publication._id || // single item in class
                  publication.id; // single item
            }
         }
      ]
   });
});
