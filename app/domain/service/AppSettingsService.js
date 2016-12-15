define([
   'module',
   'swServiceFactory',
   'underscore',
   'HashGenerator',
   'swAppUrl'
], function (module, swServiceFactory, _, HashGenerator, swAppUrl) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['$window', function ($window) {

         var STORAGE_KEY = "irls_settings_" + HashGenerator.CRC32(swAppUrl.directory);

         var localStorage = $window.localStorage;
         if (localStorage.getItem(STORAGE_KEY) === null) {
            var oldSettings = localStorage.getItem('irls_settings');
            if (null !== oldSettings) {
               oldSettings = JSON.parse(oldSettings);
               if (oldSettings.bookReadingInfo) {
                  delete oldSettings.bookReadingInfo;
               }
               localStorage.setItem(STORAGE_KEY, JSON.stringify(oldSettings));
            }
         }

         this.getSettings = function () {
            this.logger.trace('getItem() started');
            var value = localStorage.getItem(STORAGE_KEY);
            this.logger.trace('getItem() finished');
            var result = JSON.parse(value) || {};
            return result;
         };

         this.setSettings = function (settings) {
            var modified = !_.isEqual(settings, this.getSettings());
            this.logger.trace('getItem() started');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            this.logger.trace('setItem() finished');
            return modified;
         };
      }]
   });
});
