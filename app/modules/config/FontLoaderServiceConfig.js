define([
   'ngModule',
   'Context'
], function (ngModule,
             Context) {
   'use strict';

   ngModule.run([
      'swFontLoaderService',
      function (swFontLoaderService) {
         var fontRules = Context.parameters.fonts.customs.reduce(function _reducer(memo, obj) {
            if (Context.parameters.isPublic) {
               obj.rules.forEach(function (item) {
                  item.url = Context.downloadUrl + 'reader/' + item.url.replace('./', '');
               });
            }
            memo[obj.name] = obj.rules;
            return memo;
         }, {});
         swFontLoaderService._configure(fontRules);
         Object.keys(fontRules).forEach(swFontLoaderService.load);
      }
   ]);
});
