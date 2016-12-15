define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['swFontsService', 'swUnifiedSettingsService', 'swContentProvider',
         function (swFontsService, swUnifiedSettingsService,   swContentProvider ) {

            var themes = [
               {
                  name : 'default-theme-template',
                  title : 'White',
                  styles : [{
                     selector: 'body',
                     declarations: {
                        /*'backgroundColor': '#787878',*/
                        'color': '#0c0c0c',
                        'margin': '0',
                        'padding': '0'
                        }
                     },
                     {
                        selector: 'div.annotator-wrapper',
                        declarations: {
                           'backgroundColor': '#ffffff'
                        }
                     }
                  ],
                  highlightStyle: {
                     selector: '.mo-active-default',
                     declarations: {
                           'text-shadow': '0px 0px .3em rgba(255,230,0,.8)',
                           'background-color': '#ffffff'
                     }
                  }
               },
               {
                  name : 'sepia-theme-template',
                  title : 'Sepia',
                  styles : [{
                     selector: 'body',
                     declarations: {
                        /*'backgroundColor': '#beb29c',*/
                        'color': '#454545',
                        'margin': '0',
                        'padding': '0'
                        }
                     },
                     {
                        selector: 'div.annotator-wrapper',
                        declarations: {
                           'backgroundColor': '#f5eddf'
                        }
                  }],
                  highlightStyle: {
                     selector: '.mo-active-default',
                     declarations: {
                        'text-shadow': '0px 0px .3em rgb(0, 188, 115)',
                        'background-color': '#f5eddf'
                     }
                  }
               },
               {
                  name: 'night-theme-template',
                  title : 'Night',
                  styles : [{
                     selector: 'body',
                     declarations: {
                        /*'backgroundColor': '#373737',*/
                        'color': "#b3b3b3",
                        'margin': '0',
                        'padding': '0'
                        }
                     },
                     {
                        selector: 'div.annotator-wrapper',
                        declarations: {
                           'backgroundColor': '#000000'
                        }
                  }],
                  highlightStyle: {
                     selector: '.mo-active-default',
                     declarations: {
                         'text-shadow': '',
                        'background-color': '',
                        'color': '#f36730'
                     }
                  }
               }
            ];

            this.getThemes = function () {
               return themes;
            };

            this.getFonts = getFonts;

            function getFonts() {
               var fonts = swFontsService.getFonts();
               var lang = _lang();

               return _.filter(fonts, _langPredicate);

               function _langPredicate(font) {
                  return !font.langs || _.contains(font.langs, lang);
               }
            }

            this.getFontSize = function () {
               return getSettings("fontSize");
            };

            this.getTheme = function () {
              return getSettings("readingThemeName");
            };

            this.getThemeSettings = function() {
               return _.findWhere(themes, {
                  name : this.getTheme()
               });
            };

            this.getDefaultThemeSettings = function() {
               // return _.findWhere(themes, { name : 'default-theme-template' });
               return themes[0];
            };

            this.setScrollSettings = setScrollSettings;
            this.getScrollSettings = getScrollSettings;

            this.setFontSize = function (value) {
               return setSettings("fontSize", value);
            };

            this.fontSizeLimits = {};
            var MIN_FONT_SIZE = 50;
            var MAX_FONT_SIZE = 400;
            var self = this;

            function updateFontSizeLimits(fontSize) {
               self.fontSizeLimits.isMin = MIN_FONT_SIZE >= fontSize;
               self.fontSizeLimits.isMax = MAX_FONT_SIZE <= fontSize;
            }

            updateFontSizeLimits.call(this.getFontSize());

            this.decreaseFontSize = function () {
               var fs = this.getFontSize() - 10;
               fs = fs <= MIN_FONT_SIZE ? MIN_FONT_SIZE : fs;
               updateFontSizeLimits(fs);
               return this.setFontSize(fs);
            };

            this.increaseFontSize = function () {
               var fs = this.getFontSize() + 10;
               fs = fs > MAX_FONT_SIZE ? MAX_FONT_SIZE : fs;
               updateFontSizeLimits(fs);
               return this.setFontSize(fs);
            };
            
            this.setTheme = function (name) {
               return setSettings("readingThemeName", name);
            };

            function _lang() {
               return swContentProvider.getLanguage();
            }

            function _fontKey() {
               var settingKey = 'fontName';
               var lang = _lang();
               if (lang) {
                  settingKey = settingKey + '.' + lang;
               }
               return settingKey;
            }
            
            this.setFont = function(font) {
               setSettings(_fontKey(), font.name);
            };

            this.getFont = function() {
               var fonts = getFonts();

               var res = [
                  _.findWhere(fonts, {name: getSettings(_fontKey())}),
                  _.findWhere(fonts, {name: getSettings('fontName')}),
                  _.first(fonts)
               ];

               return _.first(_.compact(res));
            };

            this.setMarginNotesMode = function(mode) {
               return setSettings('expandedMarginNotes', mode);
            };

            this.getMarginNotesMode = function()
            {
               return getSettings("expandedMarginNotes");
            };

            this.setReadingPosition = function(mode) {
               return setSettings('showReadingPosition', mode);
            };

            this.getReadingPosition = function()
            {
               return getSettings("showReadingPosition");
            };

            this.getLastUserCategory = function () {
               return getSettings('materialCategoryName');
            };

            this.setLastUserCategory = function (category) {
               return setSettings('materialCategoryName', category);
            };
            
            function setSettings(key, value) {
               swUnifiedSettingsService.setSetting('ReaderSettings', key, value);
            }
            function setScrollSettings(key, value) {
               swUnifiedSettingsService.setSetting('ScrollSettings', key, value);
            }

            function getSettings(key){
               return swUnifiedSettingsService.getSetting('ReaderSettings', key);
            }

            function getScrollSettings(key){
               return swUnifiedSettingsService.getSetting('ScrollSettings', key);
            }
         }
      ]
   });
});