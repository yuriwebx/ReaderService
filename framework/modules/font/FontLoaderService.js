define([
   'module',
   'swServiceFactory',
   'underscore',
   'fontloader'
], function (module, swServiceFactory, _) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         '$window',
         '$q',
         function ($window, $q) {
            /* --- api --- */
            this.load   = loadFont;
            this.check  = checkFont;
            this.checkSystemFont = checkSystemFont;

            /* === impl === */
            var FontFace = $window.FontFace;
            var _fontRules = {};
            var _loadingFontsInfo = {};
            var _doc = $window.document;

            this._configure = _configure;

            function _configure(rules)
            {
               _.extend(_fontRules, rules);
            }

            function checkSystemFont(fontName)
            {
               var res = checkFont(fontName);
               if (!res)
               {
                  var face = new FontFace(fontName, 'local(\'' + fontName + '\')', {});
                  if (Object.keys(face).length)
                  {
                     return void 0;
                  }
               }
               return res;
            }

            function checkFont(fontName)
            {
               var added = false;
               _doc.fonts.forEach(function(fontFace)
               {
                  added = added || (fontFace.family === fontName);
               });
               var font = _toFontString(fontName);
               return added && _doc.fonts.check(font);
            }

            function loadFont(fontName)
            {
               if (checkFont(fontName) || !_.has(_fontRules, fontName))
               {
                  return $q.when(true);
               }

               if (_.has(_loadingFontsInfo, fontName))
               {
                  return _loadingFontsInfo[fontName];
               }

               var promises = _fontRules[fontName].map(function(rule)
               {
                  return _loadSingleFontFace(fontName, rule.url, rule.options);
               });

               return $q.when(promises).then(function()
               {
                  delete _loadingFontsInfo[fontName];
                  return true;
               });
            }

            function _loadSingleFontFace(fontName, url, options)
            {
               url = 'url("' + url + '")';
               var fontFace = new FontFace(fontName, url, options);
               return fontFace.load().then(function(loadedFace)
               {
                  _doc.fonts.add(loadedFace);
               });
            }

            function _toFontString(fontName)
            {
               return '1em ' + fontName;
            }
         }
      ]
   });
});
