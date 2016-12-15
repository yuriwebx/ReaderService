
define([
   'module',
   'swComponentFactory',
   'text!./LanguageField.html',
   'less!./LanguageField.less'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope: {
         popupCustomClass: '@popupcustomclass',
         extendapi: '=',
         tooltipped: '@'
      },
      controller : ['$scope', 'swI18nService', 'swUnifiedSettingsService',
         function ($scope, swI18nService, swUnifiedSettingsService) {
            var vm = $scope;
            vm.models = {};

            vm.onChangeLanguage = onChangeLanguage;
            vm.getLocalizedLanguageName = getLocalizedLanguageName;
            vm.isRtl = isRtl;

            $scope.swInit = function swInit() {
               swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _outerListener);
               vm.langs = (swUnifiedSettingsService.getGroup('LibraryParameters').libraryLanguages || []).slice(0);
               vm.models.currentLanguage = swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
               vm.popupCustomClass = vm.popupCustomClass || '';

               if (vm.tooltipped) {
                  vm.langs.unshift({caption: true, name: 'Search Tips', iconClass: 'i-info', disabled: function(){return true;}});
               }

               vm.languageOption = {
                  popupCustomClass: 'languages ' + vm.popupCustomClass,
                  data: function () {return vm.langs;},
                  format: function (item) {return typeof item === 'string' ? getLocalizedLanguageName(item) : item.name;},
                  itemTemplate: ($scope.tooltipped ? '<span class="info-tooltip" ng-click="showToolTip($event)" ng-if="item.caption"><i class="{{item.iconClass}}">' +
                  '</i><span>{{item.name}}</span></span>' +
                  '<span ng-if="!item.caption">{{getLocalizedLanguageName(item)}}</span>' : '')
               };
            };

            $scope.swDestroy = function swDestroy() {
               swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _outerListener);
               vm.models.currentLanguage = null;
            };

            $scope.showToolTip = function(event) {
               event.stopPropagation();
               vm.extendapi.isTooltipVisible = !vm.extendapi.isTooltipVisible;
               vm.languageOption.closePopup();
            };



            function getLocalizedLanguageName(key) {
               return swI18nService.getResource('Language.' + key + '.label');
            }

            function onChangeLanguage() {
               swUnifiedSettingsService.setSetting('LibraryFilteringSettings', 'selectedLibraryLanguage', vm.models.currentLanguage);
            }

            function _outerListener(setting) {
               vm.models.currentLanguage = setting.value || '';
            }

            function isRtl(lang) {
               return lang !== 'en';
            }
         }]
   });
});
