define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swPublicationsService',
         function (swPublicationsService) {

            var listeners = [];

//         var defaultLangs = [
//            'en',
//            'nl',
//            'fr',
//            'de',
//            'pt',
//            'es'
//         ],
            var langs, lang;

            this.fetchDefaultLanguages = function () {
               return swPublicationsService.getFileListByType('remote').then(function (results) {
                  langs = _.chain(results).map(_.property('language')).uniq().compact().value();
                  lang = langs[0];
                  return langs;
               });
            };

            this.onLanguageFieldChanged = function (value) {
               lang = value;
               this.logger.debug('Language field changed: ', value);
               for (var i = 0; i < listeners.length; ++i) {
                  listeners[i].apply(null, [value]);
               }
            };

            this.addOnLanguageFieldChangeListener = function (listener) {
               listeners.push(listener);
            };

            this.removeOnLanguageFieldChangeListener = function (listener) {
               for (var i = 0; i < listeners.length; ++i) {
                  if (listeners[i] === listener) {
                     listeners.splice(i, 1);
                  }
               }
            };

            this.getLanguage = function () {
               return lang;
            };

            this.getLanguages = function () {
               return langs;
            };

         }]
   });
});