define([
   'underscore',
   'module',
   'swComponentFactory',
   'swTextUtils',
   'text!./ContextNote.html',
   'less!./ContextNote.less'
], function(_, module, swComponentFactory, swTextUtils, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         noteExtendData: '=noteextenddata',
         extend: '='
      },
      controller: [
         '$scope',
         'swContextPopupService',
         'swValidationService',
         'swReadModeSettingsService',
         'swContentProvider',
         'swApplicationToolbarService',
         function (
            $scope,
            swContextPopupService,
            swValidationService,
            swReadModeSettingsService,
            swContentProvider,
            swApplicationToolbarService
         ) {

            var isEditor = swApplicationToolbarService.isEditor();

            $scope.mapColor = {
               defaultThemeTemplate: [
                  '#ffcdd2', '#f8bbD0', '#e1bee7', '#c8c7f4', '#cae2ff', '#b2ebf2',
                  '#c8e6c9', '#dcedc8', '#fff9c4', '#fff0b2', '#d9d9d9', '#a6a6a6'
               ],
               nightThemeTemplate: [
                  '#c46b74', '#ab4264', '#9d57a6', '#7e6eb2', '#345b99', '#309098',
                  '#51814c', '#788522', '#94772e', '#815639', '#9a9a9a', '#6a7285'
               ]
            };

            $scope.getActiveTheme = function getActiveTheme() {
               return swReadModeSettingsService.getTheme();
            };

            $scope.getThemeIndex = function getThemeIndex() {
               return +($scope.getActiveTheme() === 'night-theme-template');
            };

            $scope.isNightTheme = function() {
               return $scope.getActiveTheme() === 'night-theme-template';
            };

            $scope.customColors = (function() {
               var customColors = $scope.mapColor.defaultThemeTemplate.map(function(color, index) {
                  return [color, $scope.mapColor.nightThemeTemplate[index]];
               });
               return customColors;
            })();


            if (!$scope.noteExtendData) {
               $scope.noteExtendData = {};
            }

            function updateLayout() {
               swContextPopupService.updateLayout();
            }

            $scope.backToPrevState = function backToPrevState() {
               if ($scope.showColorPicker) {
                  $scope.showColorPicker = false;
               }
               else {
                  changeState($scope.prevState);
               }
               updateLayout();
            };

            function changeState(value) {
               $scope.prevState = $scope.popupState;
               $scope.popupState = value;
            }

            function setFirstUserCategory() {
               var counter = 0;
               _.each($scope.markCategories, function (value) {
                  if (!counter && !value.preset) {
                     value.firstUserCategory = true;
                     counter++;
                  }
               });
            }

            var presetCategories;
            function setCategoryNames() {
               presetCategories = _.map($scope.markCategories, function (value) {
                  return value.name;
               });
               setFirstUserCategory();
            }

            function setTextareaTextWhiteIfNeed() {
               $scope.isTextareaTextWhite = swTextUtils.getTextColor($scope.markCategories[$scope.selectedMark].color.replace(/#/, '')) === 'white';
            }

            function setExtendData(mark) {
               swReadModeSettingsService.setLastUserCategory(mark.name);
               $scope.markCategories.selectedMark = mark.name;
               $scope.markCategories.selectedMarkColor = mark.color;
               setTextareaTextWhiteIfNeed();
               $scope.noteExtendData[$scope.indexInCollection].category = mark.name;
            }

            // function getCategories() {
            //    return swContentProvider.getCategories();
            // }

            function addNewCategory(newMark) {
               $scope.markCategories.push(newMark);
               setCategoryNames();
               swContentProvider.addCustomCategory(newMark); //return promise
            }

            function removeMark(mark) {
               var name = mark.name;
               swContentProvider.removeCustomCategory(mark).then(function (categories) {
                  $scope.markCategories = categories;
                  if (!$scope.markCategories.selectedMark || $scope.markCategories.selectedMark === name) {
                     $scope.selectedMark = 0;
                  }
                  setCategoryNames();
                  updateLayout();
                  if ($scope.extend && typeof $scope.extend.removeCategory === 'function') {
                     $scope.extend.removeCategory(name);
                  }
               });
            }

            function updateMark(newMark) {
               if ($scope.oldMark.color !== newMark.color || $scope.oldMark.name !== newMark.name) {
                  _.extend($scope.markCategories[$scope.updateIndex], newMark);
                  setCategoryNames();
                  swContentProvider.addCustomCategory(newMark).then(function () {
                     $scope.extend.updateCategory($scope.oldMark.name, newMark.name);
                     setExtendData(newMark);
                  });
               }
            }

            function updateSelectedMark() {
               if ($scope.noteExtendData && $scope.noteExtendData[$scope.indexInCollection].category) {
                  var index = _.findIndex($scope.markCategories, function (value) {
                     return value.name === $scope.noteExtendData[$scope.indexInCollection].category;
                  });

                  $scope.selectedMark = index !== -1 ? index : 0;
                  $scope.noteExtendData[$scope.indexInCollection].category = $scope.markCategories[$scope.selectedMark].name;
               }
            }

            $scope.swInit = function() {
               $scope.markCategories = swContentProvider.getCategories();
               $scope.indexInCollection = $scope.indexInCollection ? $scope.indexInCollection : 0;
               changeState($scope.noteExtendData.type || 'note');
               $scope.newMarkName = '';
               setCategoryNames();
               updateSelectedMark();

               var prevUserColor = $scope.isNoteEdit() ?
                                          $scope.noteExtendData[$scope.indexInCollection].category :
                                          swReadModeSettingsService.getLastUserCategory();
               var categoryIndex;

               if (prevUserColor) {
                  categoryIndex = _.findIndex($scope.markCategories, function (val) {
                     return val.name === prevUserColor;
                  });
               }

               if (!$scope.selectedMark) {
                  $scope.selectedMark = categoryIndex && categoryIndex !== -1 ? categoryIndex : 0;
                  setExtendData($scope.markCategories[$scope.selectedMark]);
               }
               else {
                  setTextareaTextWhiteIfNeed();
               }

               if ($scope.noteExtendData.type === 'comment') {
                  if (!$scope.noteExtendData[$scope.indexInCollection].position) {
                     $scope.noteExtendData[$scope.indexInCollection].position = 'B';
                  }
               }
            };

            $scope.getTextareaBorderColor = function(category) {
                return {'boxShadow': (category.underline ? 'none' : '0px 0px 0px 7px ' + category.color + ', #ccc 0 -1px 0 7px')};
            };

            $scope.setPrevNextIndex = function (index) { // number: 1 - next; -1 - prev
               var collectionLength = $scope.noteExtendData.length,
                   newIndex = $scope.indexInCollection + index;
               if (newIndex <= 0) {
                  $scope.indexInCollection = 0;
               }
               else if (newIndex >= collectionLength) {
                  $scope.indexInCollection = collectionLength - 1;
               }
               else {
                  $scope.indexInCollection = newIndex;
               }
               updateSelectedMark();
            };

            $scope.isNoteReadOnly = function () {
               return $scope.noteExtendData[$scope.indexInCollection].studyGuide && !isEditor;
            };

            $scope.isNoteEdit = function () {
               if ($scope.noteExtendData[$scope.indexInCollection].id && ($scope.popupState === 'note' || $scope.popupState === 'comment')) {
                  return true;
               }
            };
            
            //////////CATEGORY//////////
            var DEFAULT_CATEGORY_NAME = 'My mark';

            $scope.toggleEdit = function () {
               $scope.showEdit = !$scope.showEdit;
               updateLayout();
            };

            $scope.deleteItem = function () {
               $scope.extend.deleteItem($scope.noteExtendData[$scope.indexInCollection]);
            };

            $scope.setMark = function(mark, index) {
               if ($scope.showEdit) {
                  return;
               }
               $scope.selectedMark = index;
               setExtendData(mark);
               $scope.backToPrevState();
            };

            $scope.showMark = function() {
               changeState('mark');
               updateLayout();
            };
            $scope.closeMark = function() {
               $scope.extend.closePopup(null);
            };


            function darkeningColor(str) {
               var hexArr = str.replace(/#/, '').match(/.{2}/g);
               var rgbArr = [];

               var parse = function (h16) {
                  return parseInt(h16, 16);
               };

               _.each(hexArr, function (val) {
                  var rgbCode = parse(val) - 50;
                  rgbCode = rgbCode > 0 ? rgbCode : 0;
                  rgbArr.push(rgbCode);
               });
               return 'rgb(' + rgbArr.join(',') + ')';
            }

            $scope.changeColor = function (mark) {
               return  $scope.isNightTheme() ? darkeningColor(mark.nightColor) : darkeningColor(mark.color);
            };

            $scope.addNewMark = function(mark) {
               var categoryNameArray = _.pluck($scope.markCategories, 'name');
               var num = 1;

               $scope.showColorPicker = true;

               if (mark) {
                  $scope.newMarkName = mark.name;
                  $scope.selectedMapIndex = _.indexOf($scope.mapColor.defaultThemeTemplate, mark.color);
               }
               else {
                  setCategoryPlaceholderName();
                  setCategoryRandomColor();
               }

               updateLayout();

               function setCategoryPlaceholderName() {
                  var name = DEFAULT_CATEGORY_NAME + ' ' + num,
                     findName = _.indexOf(categoryNameArray, name);

                  if (findName !== -1) {
                     num++;
                     setCategoryPlaceholderName();
                  }
                  else {
                     $scope.categoryPlaceholder = name;
                  }
               }

               function setCategoryRandomColor() {
                  var isNightTheme = $scope.isNightTheme();
                  var theme = $scope.mapColor[isNightTheme ? 'nightThemeTemplate' : 'defaultThemeTemplate'];
                  var categoryColors = _.chain($scope.markCategories).filter(function (val) {return !val.preset;}).pluck( (isNightTheme ? 'nightColor' : 'color') ).uniq().value();
                  var mapLength = theme.length;
                  var rand = _.random(0, mapLength - 1);
                  var findColor = _.indexOf(categoryColors, theme[rand]);

                  if (findColor !== -1 && mapLength > categoryColors.length) {
                     setCategoryRandomColor();
                  }
                  else {
                     $scope.selectMapIndex(rand);
                  }
               }
            };

            $scope.removeUserCategory = function (mark, e) {
               e.stopPropagation();
               removeMark(mark);
            };


            ///////////ADD CATEGORY//////////////

            $scope.validateMarkName = function (name) {
               if (!name) {
                  return;
               }

               var isExist = $scope.isEditMode ? false
                  : _.find(presetCategories, function (presetName) {
                      return presetName.toLowerCase() === name.toLowerCase();
                   });
               return {
                  from: {
                     valid: !isExist,
                     message: 'ReaderFramework.categoryNameError.label'
                  }
               };
            };

            $scope.setMarkPosition = function (position) {
               $scope.noteExtendData[$scope.indexInCollection].position = position;
            };

            $scope.underlineSwitcher = function () {
               $scope.noteExtendData[$scope.indexInCollection].isUnderlineOn = !$scope.noteExtendData[$scope.indexInCollection].isUnderlineOn;
            };

            $scope.addColor = function (categories) {
               swValidationService.setValidationMessagesEnabled($scope.form, true);

               if (!$scope.form.$valid || !$scope.selectedColor || !$scope.newMarkName && !$scope.categoryPlaceholder && !$scope.selectedNightColor) {
                  return;
               }

               var updateObj = {
                  color: $scope.selectedColor,
                  nightColor: $scope.selectedNightColor,
                  name: $scope.newMarkName || $scope.categoryPlaceholder
               };

               if ($scope.isEditMode) {
                  updateMark(updateObj);
               }
               else {
                  addNewCategory(updateObj);
               }

               $scope.backToPrevState();

               var lastMark = categories.length - 1;
               $scope.setMark(categories[lastMark], lastMark);

               //$scope.toggleEdit();

               delete $scope.selectedColor;
               delete $scope.selectedNightColor;
               delete $scope.newMarkName;
               delete $scope.isEditMode;
            };

            $scope.selectMapIndex = function (index) {
               $scope.selectedMapIndex = index;
               $scope.selectedColor = $scope.mapColor.defaultThemeTemplate[index];
               $scope.selectedNightColor = $scope.mapColor.nightThemeTemplate[index];
            };

            ///////////EDIT CATEGORY//////////////
            $scope.editCategory = function (mark, e) {
               e.stopPropagation();
               $scope.oldMark = _.clone(mark);
               $scope.isEditMode = true;
               $scope.addNewMark(mark);
            };

         }]
   });
});
