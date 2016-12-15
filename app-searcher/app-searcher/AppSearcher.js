define([

   'swComponentFactory',
   'module',
   'underscore',

   'text!config/client.config.json',
   'text!config/local.client.config.json',
   'text!config/deployment.config.json',
   'less!./AppSearcher.less'

], function (swComponentFactory, module, _) {

   'use strict';

   swComponentFactory.create({
      module : module,
      isolatedScope: {
         search   : '@',
         lang     : '@',
         clientid : '@'
      },
      controller : [

         '$timeout',
         'swUserService',
         'swPopupService',
         'swSearchFieldService',
         'swUnifiedSettingsService',

         function(

            $timeout,
            swUserService,
            swPopupService,
            swSearchFieldService,
            swUnifiedSettingsService,
            /* jshint unused: true */
            swComponentAugmenter,
            $scope,
            $element

         ) {

            $scope.swInit = init;
            $scope.extendapi = {
               clientid: $scope.clientid
            };

            function init() {
               swUserService.bootstrapApplication().then(_refreshDefaultLang).then(showPopup);
            }

            function _refreshDefaultLang() {
               var langs = swUnifiedSettingsService.getGroup('LibraryParameters').libraryLanguages;
               var lang = _.contains(langs, $scope.lang) ? $scope.lang : _.first(langs);
               swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedLibraryLanguage', lang);
            }

            function showPopup() {
               swSearchFieldService.onSearchFieldChanged($scope.search);
               var clientRect = {
                  top      : 44,
                  height   : 44
               };

               var options = {
                  layout : {
                     margin: {
                        top: 60
                     },
                     of : {
                        clientRect: clientRect
                     }
                  },
                  backdropVisible: true,
                  scope          : $scope,
                  template       : '<sw-read-mode-search extendapi="extendapi"></sw-read-mode-search>'
               };

               var popup = swPopupService.show(options);

               popup.promise.then(function () {
                  swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _onChangeLang);
                  $element.remove();
                  $element.closest('body').removeClass('active-popup');
               });

               popup.readyPromise.then(_onChangeLang).then(function() {
                  swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _onChangeLang);
                  $element.closest('body').addClass('active-popup');
               });

               function _onChangeLang() {
                  var lang = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');

                  var ltr = _.contains(['en'], lang);

                  popup.element.toggleClass('dir-ltr', ltr);
                  popup.element.toggleClass('dir-rtl', !ltr);
               }
            }
         }
      ]
   });
});
