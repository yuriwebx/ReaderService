/*jslint camelcase: false */
define([
   'module',
   'swServiceFactory',
   'Context',
   'underscore'
], function (module, swServiceFactory, Context, _) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$window', 'swFontLoaderService',
         function ($window, swFontLoaderService) {
            /* --- api --- */
            this.getFonts = getFonts;

            /* === impl === */
            var fonts = [];

            function getFonts() {
               return fonts;
            }

            var detector = new Detector($window.document);

            (function _checkSystemFonts() {
               Context.parameters.fonts.systems.forEach(function(font) {
                  var fontNames = Array.isArray(font.name) ? font.name : [font.name];

                  var _predicate = _.partial(_isInstalled, font.family);

                  var fontName = _.find(fontNames, _predicate);

                  if (fontName) {
                     fonts.push(_fontDescription(font, fontName));
                  }
               });
            })();

            function _isInstalled(fontFamily, fontName) {
               var res = swFontLoaderService.checkSystemFont(fontName) === true;
               res = res || ((swFontLoaderService.checkSystemFont(fontName) === void 0) && detector.detect(fontName, fontFamily));

               return res;
            }

            fonts = fonts.concat(Context.parameters.fonts.customs.map(function(font) {
               return _fontDescription(font);
            }));

            function _fontDescription(font, fontName) {
               fontName = fontName || font.name;
               var styles = font.styles || {};
               var stylesDeclarations = {
                  'font-family': fontName
               };
               _.extend(stylesDeclarations, styles);

               return {
                  name     : fontName.toLowerCase().split(' ').join('_'),
                  label    : fontName,
                  langs    : font.langs,

                  styles   : {
                     selector: 'body *',
                     declarations: stylesDeclarations
                  }
               };
            }
         }
      ]
   });

   function Detector(document) {
      var width,
          body          = document.body,
          container     = document.createElement('div'),
          containerCss  = [
             'position:absolute',
             'width:auto',
             'font-size:128px',
             'visibility:hidden',
             'display:inline-block'
          ];

      container.innerHTML = '<span style="' + containerCss.join(' !important;') + '">' + (new Array(100)).join('wia') + '</span>';
      container = container.firstChild;

      function _calculateWidth(fontFamily) {
         container.style.fontFamily = fontFamily;

         body.appendChild(container);
         width = container.clientWidth;
         body.removeChild(container);

         return width;
      }

      var _fontFamilies = ['monospace', 'serif', 'sans-serif', 'cursive'];
      var _widthCache = _fontFamilies.reduce(function(memo, family) {
         memo[family] = _calculateWidth(family);
         return memo;
      }, {});

      this.detect = function detect(fontName, fontFamily) {
         var anotherFontFamilies = _.without(_fontFamilies, fontFamily);
         var anotherFontFamily = _.first(anotherFontFamilies);
         return _widthCache[anotherFontFamily] !== _calculateWidth(fontName + ', ' + anotherFontFamily);
      };
   }

});