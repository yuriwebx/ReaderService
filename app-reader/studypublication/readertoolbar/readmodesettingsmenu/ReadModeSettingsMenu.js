define([
   'module',
   'jquery',
   'swComponentFactory',
   'text!./ReadModeSettingsMenu.html',
   'less!./ReadModeSettingsMenu.less',
   'less!./ReadModeSettingsMenuThemeMixin.less'
], function(module, $, swComponentFactory, template){
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      controller: [
         '$scope',
         'swThemeManager',
         'swFeatureDetector',
         'swReadModeSettingsService',
         'swApplicationToolbarService',
         function(
            $scope,
            swThemeManager,
            swFeatureDetector,
            swReadModeSettingsService,
            swApplicationToolbarService
         ){

            $scope.fonts = swReadModeSettingsService.getFonts();
            $scope.themes = swReadModeSettingsService.getThemes();
            $scope.popupState = '';
            $scope.isEditor = swApplicationToolbarService.isEditor();

            $scope.setState = function (setting) {
               $scope.popupState = setting;
            };

            var tabsReadingPos        = ['Keep on Screen', '1 Page Scroll'];
            var tabsPageLengthShift   = ['0.5', '1'];
            var tabsTapMode           = ['one', 'two'];
            var tabsReproductionType  = ['Audio', 'TTS'];

            function getTabOption(tabs) {
               return {
                  data: function () {
                      return tabs;
                  },
                  format: function (item) {return item;},
                  mode: function () {return 't';},
                  isMoreAllowed: function () {return 'never';}
               };
            }

            $scope.setScrollOption = function(key){
               swReadModeSettingsService.setScrollSettings(key, $scope.option[key]);
            };

            $scope.getScrollOption = function(key){
               return swReadModeSettingsService.getScrollSettings(key);
            };

            var pageLengthShiftNumber                =  tabsPageLengthShift.indexOf($scope.getScrollOption('pageLengthShift').toString());
            var ReadingPosNumber                     =  tabsReadingPos.indexOf($scope.getScrollOption('readingPosition'));
            var TapModeOnNumber                      =  tabsTapMode.indexOf($scope.getScrollOption('tapMode'));
            var tabsReproductionTypeNumber           =  tabsReproductionType.indexOf($scope.getScrollOption('reproductionType'));

            $scope.tabsReadingPosOptions             =  getTabOption(tabsReadingPos);
            $scope.tabsPageLengthShiftOptions        =  getTabOption(tabsPageLengthShift);
            $scope.tabsTapOnOptions                  =  getTabOption(tabsTapMode);
            $scope.tabsReproductionType              =  getTabOption(tabsReproductionType);
            $scope.option                            =  {
               pageLengthShift         : tabsPageLengthShift[pageLengthShiftNumber],
               readingPosition         : tabsReadingPos[ReadingPosNumber],
               tapMode                 : tabsTapMode[TapModeOnNumber],
               reproductionType        : tabsReproductionType[tabsReproductionTypeNumber],
               //useTtsWithoutAudio      : $scope.getScrollOption('useTtsWithoutAudio'),
               viewScrollBorder        : $scope.getScrollOption('viewScrollBorder'),
               snapToScrollBorder      : $scope.getScrollOption('snapToScrollBorder'),
               inertialScrolling       : $scope.getScrollOption('inertialScrolling'),
               textScrolling           : $scope.getScrollOption('textScrolling'),
               sideScrolling           : $scope.getScrollOption('sideScrolling'),
               sideTapping             : $scope.getScrollOption('sideTapping'),
               inertialScrollingSpeed  : $scope.getScrollOption('inertialScrollingSpeed'),
               audioSpeed              : $scope.getScrollOption('audioSpeed'),
               audioAutoScrolling      : $scope.getScrollOption('audioAutoScrolling'),
               showReadingPosition     : swReadModeSettingsService.getReadingPosition('showReadingPosition'),
               allowPlaybackRateAdjustment : swFeatureDetector.isDesktop()
            };

            var fontSizeLimits = swReadModeSettingsService.fontSizeLimits;

            function updateFontSizeLimits() {
               $scope.isMin = fontSizeLimits.isMin;
               $scope.isMax = fontSizeLimits.isMax;
            }

            updateFontSizeLimits();

            $scope.decreaseFontSize = function()
            {
               swReadModeSettingsService.decreaseFontSize();
               updateFontSizeLimits();
            };

            $scope.increaseFontSize = function()
            {
               swReadModeSettingsService.increaseFontSize();
               updateFontSizeLimits();
            };

            $scope.setReaderTheme = function(element)
            {
               $('body>div').attr('id', element.name);
               swThemeManager.activateTheme(element.name);
               return swReadModeSettingsService.setTheme(element.name);
            };

            $scope.setFont = function(font)
            {
               return swReadModeSettingsService.setFont(font);
            };

            $scope.getCurrentFont = function()
            {
               return swReadModeSettingsService.getFont();
            };

            $scope.marginNotesMode = !!swReadModeSettingsService.getMarginNotesMode();

            $scope.toggleMarginNotes = function()
            {
               $scope.marginNotesMode = !$scope.marginNotesMode;
               swReadModeSettingsService.setMarginNotesMode($scope.marginNotesMode);
            };

            $scope.toggleReadingPosition = function()
            {
               swReadModeSettingsService.setReadingPosition($scope.option.showReadingPosition);
            };
      }]
   });
});