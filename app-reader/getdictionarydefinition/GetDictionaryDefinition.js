define([
   'module',
   'swComponentFactory',
   'text!./GetDictionaryDefinition.html',
   'text!./DictionaryContent.html',
   'less!./GetDictionaryDefinition.less'
], function(module, swComponentFactory, template, dictContent) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         definition: '='
      },
      controller: [ '$scope', 'swDictionaryService', 'swContextPopupService', 'swApplicationToolbarService',

         function($scope, swDictionaryService, swContextPopupService, swApplicationToolbarService) {

            $scope.isEditor = swApplicationToolbarService.isEditor();
            $scope.toolbarObject = {
               'clickedEtymology' : {},
               'clickedDefinitionsAndExamples' : {},
               'clickedSynonym': {}
            };
            $scope.dictContent = dictContent;
            
            $scope.showToolbarItem = function(){
               var arg = Array.apply(this, arguments);
               if(arg.length && typeof arg[0] === 'string' && $scope.toolbarObject.hasOwnProperty(arg[0])){
                  var keys = arg.slice(1, arg.length);
                  $scope.toolbarObject[arg[0]] = addObject($scope.toolbarObject[arg[0]], keys);
                  swContextPopupService.updateLayout();
               }
            };

            $scope.getPart = function(data, term, tagStart, tagEnd) {
               return swDictionaryService.getPart(data, term, tagStart, tagEnd);
            };

            $scope.showNotEmptyObject = function(items) {
               return Object.keys(items).length !== 0;
            };

            $scope.showExample = function(def) {
               return def.text.length !== 0;
            };
            
            $scope.swInit = function() {};

            function addObject(obj,keys){
               var key;
               if(keys.length === 1){
                  obj[keys[0]] = obj[keys[0]] ? false : true;
                  return obj;
               }
               else{
                  key = keys.shift();
                  obj[key] = !obj.hasOwnProperty(key) ? {} : obj[key];
                  obj[key] = addObject(obj[key], keys);
                  return obj;
               }
            }
         }
      ]
   });
});