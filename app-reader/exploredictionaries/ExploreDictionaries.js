define([
   'module',
   'swComponentFactory',
   'text!./ExploreDictionaries.html',
   'less!./ExploreDictionaries.less'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine : true,
      controller: [
         '$scope',
         'swDictionaryService',
         'swUnifiedSettingsService',
         function(
            $scope,
            swDictionaryService,
            swUnifiedSettingsService
         )
         {
            var vm = $scope;
            /* --- api --- */

            vm.definition = {isDictionary: true};
            vm.onChangeSize = onChangeSize;
            vm.startResizePosition = swUnifiedSettingsService.getSetting('ResizeColumnSettings', 'Dictionary');

            /* === impl === */

            $scope.swApplicationScrollType = 'NONE';

            function onChangeSize(size) {
               swUnifiedSettingsService.setSetting('ResizeColumnSettings', 'Dictionary', size);
            }

            $scope.swInit =  swInit;

            $scope.swSubmachine.configure({
               'BookList' : {
                  uri : 'booklist',
                  history : false,
                  params : [
                     {
                        name : 'type'
                     }
                  ],
                  getParams : function () {
                     return {
                        type : $scope.type
                     };
                  }
               }
            });

            function swInit()
            {
               swDictionaryService.initDictionary('en');
            }
         }
      ]
   });
});