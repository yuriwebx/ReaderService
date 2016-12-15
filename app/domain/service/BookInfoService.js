define([
   'module',
   'swServiceFactory',
   'underscore'
], function(module, swServiceFactory, _) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swUnifiedSettingsService',
               function(swUnifiedSettingsService) {

         /* --- api --- */
         this.saveBookInfo = saveBookInfo;
         this.removeBook   = removeBook;
         this.getBookInfo  = getBookInfo;

         this.getAllBookInfo  = getAllBookInfo;
         this.getLastBookInfo = getLastBookInfo;

         /* === impl === */
         function _save(settings) {
            swUnifiedSettingsService.setSetting('BookReadingInfo', 'bookMark', settings);
         }

         function saveBookInfo(bookKey, info) {
            var settings = getAllBookSettings();
            var currentSettings = settings[bookKey._id] || {};
            currentSettings = _.defaults(info, currentSettings, {_id : bookKey._id});
            currentSettings._lastUpdateTime = new Date(currentSettings.lastReadTime).getTime();
            settings[bookKey._id] = currentSettings;
            _save(settings);
         }

         function removeBook(bookId) {
            var settings = getAllBookSettings();
            delete settings[bookId];
            _save(settings);
         }

         function getBookInfo(bookKey) {
            return getAllBookSettings()[bookKey._id];
         }

         function getAllBookSettings() {
            return swUnifiedSettingsService.getSetting('BookReadingInfo', 'bookMark') || {};
         }

         function getLastReadTime(book) {
            return book._lastUpdateTime || new Date(book.lastReadTime).getTime();
         }

         function _sortByTimeDesc(a, b) {
            return getLastReadTime(b) - getLastReadTime(a);
         }

         function getAllBookInfo() {
            return _.values(getAllBookSettings()).sort(_sortByTimeDesc);
         }

         function getLastBookInfo() {
            return getAllBookInfo()[0];
         }
      }]
   });
});