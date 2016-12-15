/**
 * Specific input select component that could be represented as
 *    - ordinary select input
 *    - ordinary tabs
 *
 * Component is based on "ng-model" and so supports "ng-change", validation etc.
 *
 * Usage:
 *
 *   <sw-input-select options="expr" ng-model="expr"></sw-input-select>
 *
 *      "options" expression should be evaluated to an object:
 *
 *      ///////////// General options ////////////////
 *      data:   function() { return [...]; },
 *         function returns an array of items (similar to HTMLOptions of HTMLSelect)
 *         required param
 *
 *      id:     function(item) { return ...; },
 *         function converts item to identity (similar to angular "track by")
 *         default: item.id || array.index
 *
 *      format: function(item) { return @string; },
 *         function converts item to text to be displayed
 *         default: item.text (should be set if used)
 *
 *      mode: function() { return 's'|'t'|'a'|'f'|'fs'; }
 *         function returns the mode:
 *           's'  - (default) select
 *           't'  - switchable tabs
 *           'a'  - action tabs(don't have active tab)
 *           'f'  - filter mode
 *           'fs' - auto switch between 'f' and 's' modes on touch device, if is touch device and 'query' not specify will be selected 's' mode in other cases 'f' mode
 *         Note: ng-model will be ignored in 'a' mode
 *
 *      click: function(clickedItem) { ... },
 *         callback triggered by clicking on an item
 *         if placeholder is visible, callback is also triggered by clicking it,
 *           in this case `clickedItem` is `undefined`
 *
 *      itemTemplate: @string '<i class="{{item.myIconClassName}}"></i><span>{{item.myText}}</span>',
 *         string with Angular template to compile for each item
 *         [{myIconClassName: '...0', myText: '...t0'}, {myIconClassName: '...1', myText: '...t1'}, ...]
 *         Note: use 'hideable' class on any element in this template
 *           to hide it before other elements when parent container doesn't fit (unless in 's' mode).
 *           In 's' and 'f' mods 'itemTemplate' OR 'itemPopupTemplate' will be used in popup,
 *             if both options are specified 'itemPopupTemplate' will be used 'itemTemplate' will be ignored
 *         default: result of calling `format()` for each item


 *      In 's' and 'f' mods 'itemTemplate' OR 'itemPopupTemplate' will be used in popup,
 *         if both options are specified 'itemPopupTemplate' will be used 'itemTemplate' will be ignored


 *      itemPopupTemplate: @string '<i class="{{item.myIconClassName}}"></i><span>{{item.myText}}</span>',
 *         If set, used in popup representation.
 *         If not, `itemTemplate` is used instead.
 *
 *      popupCustomClass: @string,
 *        default: ''
 *
 *      isClearAllowed: function() { return true|false; },
 *         In 's' mode: Turns on/off placeholder for empty value.
 *         In 'f' mode: Turns on/off icon to clear text field.
 *         default: false
 *         Supported only in 's' and 'f' modes; in other modes will be ignored
 *
 *      ///////////// Select options ////////////////
 *
 *      alignWidth: @Boolean
 *         Hide popup arrow and set popup width to be the same as "of"
 *         default: false
 *
 *      options.closePopup(); close select popup for more details look options.update()
 *      //TODO: add disabledClass configurability to InputSelect
 *
 *      ///////////// Select and Filter modes options ////////////////
 *
 *      i18n.placeholder: @string, // default: '-- Select --'
 *      i18n.moreTooltipText: @string // default: ''
 *      i18n.filterPopupPlaceholder: @string // default: 'No result'
 *          Note: for all placeholders used swI18nService.getResource
 *
 *      ///////////// Tabs mode options ////////////////
 *      isMoreAllowed: function() { return 'never'|'asNeeded'|'always'; },
 *         Turns on/off 'More' button.
 *         default: 'asNeeded'
 *         case insensitive
 *
 *      moreTemplate: @string,
 *         Angular template for 'More' button
 *         default: ''
 *         Example: '<i class="{{data.icon}}"></i><span sw-localize="data.name"></span>'
 *
 *      morePosition: 'r'|'l'
 *         default: 'r'
 *
 *      moreExtendScope: {data: @Object}
 *
 *      //////////////////////////////////////////////////////////////////////////////////////////////
 *      // After component creating to options object will be add update method that re-init tabs   //
 *      // Can be used for add, remove or change tab position                                       //
 *      // For example:                                                                             //
 *      // var obj = [1,2,3]                                                                        //
 *      // $scope.options = {                                                                       //
 *      //    data: function(){return obj;}                                                         //
 *      // }                                                                                        //
 *      // $scope.doSomethingWithObj = function(){                                                  //
 *      //    obj[3] = 4;                                                                           //
 *      //    $scope.options.update();                                                              //
 *      // }                                                                                        //
 *      // Will be removed when component is destroyed                                              //
 *      //////////////////////////////////////////////////////////////////////////////////////////////
 *
 *      ///////////// Filter mode options ////////////////
 *      query: function(@string) { return @promise; }
 *         Promise must return collection like in 'data' option
 *         For customize collection use:
 *            query: function(str) {
 *               return swSearch({q: str}).then(function (data) {
 *                  return data.rows;
 *               });
 *            }
 *
 *      parse: function(@string) { return {...}; }
 *         function converts text to item
 *         default: no
 *         ///////////////////////////////////////////////////
 *         must be specified so that FREE TEXT to be supported
 *         ///////////////////////////////////////////////////
 *
 *      isStrict: function() { return true|false; }
 *         Use strict filter for filtering 'data' collection
 *         default: true
 *
 *      debounce: @number in milliseconds
 *         Set debounce in ng-model-options for input field
 *         default: 0
 *
 *      minimumInputLength: @number
 *         Number of characters necessary to start a search.
 *         default: 1
 *         only for 'query' option
 *
 *      maximumInputLength: @number
 *         default: ''
 *
 *      disableOpenSelectOnEnter: @Boolian
 *         Disable the opening popup by pressing the 'enter' button (only 'down')
 *         default: false
 *
 *      ////////////// Item property for 's', 't', 'a' modes ///////////////////
 *      item.disabled: function(){ return true|false; }
 *         If `true`, disables the corresponding tab/option (no click handling, specific class is applied)
 *         default: false
 *
 *      item.click: function(item) {...}
 *         callback triggered by clicking on an item
 *         will be called before 'options.click'
 *         not support stopPropagation
 *
 *      item.popupOnly: function() { return true|false; }
 *         if 'true' item will be displayed only in popup
 *         allowed only in 'a' mode
 *
 *
 * Examples
 *
 * Select
 *
 * Example 1
 *
 *
      <sw-input-select ng-model="m.selectModel" options="options"
         ng-change="selectChange()"
      ></sw-input-select>

       var selectData = [0, 1, 2];

       $scope.options = {
          data: function () {
             return selectData;
          },
          format: function (item) {return item.toString();}
       };

       $scope.$watch('m.selectChange', function() {...})
         OR
       $scope.selectChange = function () {...};
 *
 *
 * Example 2
 *
      <sw-input-select ng-model="m.selectModel" options="options"></sw-input-select>

      var selectData = [
         {id: 1, myText: 'item 1'},
         {id: 2, myText: 'item 2'}
      ];

      $scope.m = {};
      m.selectModel = selectData[1];

      $scope.options = {
         data: function () {
            return selectData;
         },
         id: function(item) { return item.id;},
         format: function (item) {return item.myText;},
      };
 *
 *
 * Example 3
 *
       <sw-input-select ng-model="m.selectModel" options="options"></sw-input-select>

       var selectData = [
          {id: 1, myText: 'item 1', count: 4},
          {id: 2, myText: 'item 2', count: 1}
       ];

       $scope.options = {
          data: function () {
             return selectData;
          },
          i18n: {placeholder: 'Select some item'},
          isClearAllowed: function() { return true; },
          id: function(item) { return item.id;},
          format: function (item) {return item.myText;},
          itemTemplate: '<span>{{item.myText}} <sup>{{item.count}}</sup></span>',
          popupCustomClass: 'my-popup-style'
      };
 *
 *
 *
 * Tabs
 *
 * Example 1
 *
      <sw-input-select ng-model="m.tabModel" class="..." options="tabsOptions"></sw-input-select>


      var tabsData = ['Left item', 'Right Item'];

      $scope.tabsOptions = {
         data: function () {
            return tabsData;
         },
         format: function (item) {return item;},
         mode: function () {return 't';},
         isMoreAllowed: function () {return 'never';}
      };
 *
 *
 *
 * Example 2
 *
      <sw-input-select class="..." ng-model="m.tabModel" ng-change="tabSelected(m.tabModel)" options="tabsOptions"></sw-input-select>


       var tabsData = [
          {name: 'Regular', val: 1},
          {name: 'Recurring', val: 2},
          {name: 'Future', val: 3}
       ];

      $scope.m = {};
      $scope.m.tabModel = tabsData[1];

      $scope.$watch('m.tabModel', function (...) {
         ...
      });
      $scope.tabSelected = function (...) { //ngChange
         ...
      };

      $scope.tabsOptions = {
         data: function () {
            return tabsData;
         },
         id: function (item) {return item.val;},
         format: function (item) {return item.name;},
         mode: function () {return 't';},
         moreTemplate: 'More'
      };
 *
 *
 * Example 3
 *
      <sw-input-select class="..." options="tabsOptions"></sw-input-select>

       var tabsData = [
          {name: 'tab 1', val: 1, className: 'sys-04-doc-64-edit', disabled: function(){ return true;} },
          {name: 'tab 2', val: 2, className: 'sys-04-doc-65-group', click: function(tab){...} },
          {name: 'tab 3', val: 3, className: 'sys-04-doc-66-done'}
       ];

       $scope.tabsOptions = {
          data: function () {
             return tabsData;
          },
          id: function (item) {return item.val;},
          format: function (item) {return item.name;},
          mode: function () {return 'a';},
          click: function (tab) {
             ...
          },
          itemTemplate: '<span><i class="{{item.className}}">{{item.count}}</i><span class="hideable">{{item.name}}</span></span>',
          moreTemplate: '<i class="sys-07-moon-86-more"></i>',
          morePosition: 'l'
      };

      //for action tabs ng-change and $watch not work use 'click'
 *
 *
 * Filter/Autocomplite/Search
 *
 * Example 1
 *
      <sw-input-select ng-model="m.input" ng-change="modelChange()" options="inputOption"></sw-input-select>

      $scope.m = {};
      $scope.inputOption = {
         data: function () {
            return ['one', 'two', 3];
         },
         format: function (item) {
            return item.toString();
         },
         mode: function () {
            return 'f';
         },
         isStrict: function () {
            return false;
         }
      };

      $scope.modelChange = function () {
         console.log($scope.m.input);
      };
 *
 *
 * Example 2
 *
      <sw-input-select ng-model="m.input2" ng-change="modelChange2()" options="inputOption2"></sw-input-select>

      $scope.inputOption2 = {
         data: function () {
            return ['one', 'two', 3];
         },
         format: function (item) {
            return item.toString();
         },
         mode: function () {
            return 'f';
         }
      };

      $scope.modelChange2 = function () {
         console.log($scope.m.input2);
      };
 *
 *
 * Example 3
 *
      <sw-input-select ng-model="m.input3" ng-change="modelChange3()" options="inputOption3"></sw-input-select>

      $scope.inputOption3 = {
         query: function (str) {
            return swSearch.search({q: str}).then(function (data) {
               return data.rows;
            });
         },
         data: function () {
            return ['one', 'two', 3];
         },
         format: function (item) {
            var formated;
            if (_.isObject(item)) {
               formated = item.author + ' - ' + item.title;
            } else {
               formated = item.toString();
            }
            return formated;
         },
            mode: function () {
            return 'f';
         },
         parse: function (item) {
            return item;
         },
         debounce: 300
      };

      $scope.modelChange3 = function () {
         console.log($scope.m.input3);
      };
 *
 *
 *    //////////////////////////////////////////////////////////////////////////
 *    /// See more examples in Theme application (/app-theme/modules/theme) ////
 *    //////////////////////////////////////////////////////////////////////////
 *
 */


define([
   'module',
   'ngModule',
   'underscore',
   'jquery',
   'swLoggerFactory',
   'text!./InputSelect.html',
   'text!./InputSelectPopup.html',
   'text!./InputSelectFilterPopup.html',
   'less!./InputSelect.less'
], function(
   module,
   ngModule,
   _,
   $,
   swLoggerFactory,
   template,
   popupTemplate,
   filterPopupTemplate
){
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   var dirName = 'swInputSelect';
   var classNames = {
      disabled: 'sw-input-select-disabled',
      moreBt: 'sw-input-select_t-more',
      popupActive: 'sw-input-select_popup-active',
      disabledItem: 'sw-input-select_item-disabled',
      disabledPopupItem: 'sw-input-select_popup-item-disabled',
      itemSelected: 'sw-input-select_s-item-selected',
      selectPopup: 'sw-input-select_s-popup',
      selectPopupList: 'sw-input-select_s-popup-list',
      selectItemActive: 'sw-input-select_s-item-active',
      tabsPopup: 'sw-input-select_t-popup',
      tabsPopupList: 'sw-input-select_t-popup-list',
      tabsList: 'sw-input-select_t-list',
      tabsItem: 'sw-input-select_t-item',
      tabsItemCollapsed: 'sw-input-select_t-item-collapsed',
      tabsFirstVisible: 'sw-input-select_t-item-first-visible',
      tabsLastVisible: 'sw-input-select_t-item-last-visible',
      tabsActive: 'sw-input-select_t-item-active',
      filterInput: 'sw-input-select_f-input',
      filterArrow: 'sw-input-select_f-arrow',
      filterPopup: 'sw-input-select_f-popup',
      filterPopupList: 'sw-input-select_f-list',
      filterPopupItem: 'sw-input-select_f-item',
      filterPopupSelectedItem: 'sw-input-select_f-item-selected',
      filterExpander: 'sw-input-select_f-body-expander'
   };

   ngModule.directive(dirName, [
      '$timeout',
      '$compile',
      'swPopupService',
      'swApplicationScroll',
      'swStickyService',
      'swLayoutManager',
      'swFeatureDetector',
      'swTooltipService',
      'swI18nService',
      'swScrollFactory',
      'swHotKeyService',
      function(
         $timeout,
         $compile,
         swPopupService,
         swApplicationScroll,
         swStickyService,
         swLayoutManager,
         swFeatureDetector,
         swTooltipService,
         swI18nService,
         swScrollFactory,
         swHotKeyService
      )
   {
         logger.trace('register');
         return {
            restrict: 'E',
            replace: true,
            template: template,
            require: '?ngModel',
            scope: true,
            compile: function()
            {
               return function(scope, el, attr, ctrl)
               {
                  /////////////////////// Initialization ///////////////////////
                  var _options,
                     _originalOptions,
                     _popup,
                     _tempTabsWidth,
                     _isInit = true;

                  scope.filterScope = {};

                  _originalOptions = scope.$eval(attr.options);
                  _options = _.clone(_originalOptions);

                  if (_.isEmpty(_options))
                  {
                     throw new Error(dirName + ': \'options\' attribute should be specified');
                  }

                  _.defaults(_options, {
                     data: _.noop,
                     query: _.noop,
                     id: function(item)
                     {
                        if (item && (item.id || item.id === 0))
                        {
                           return item.id;
                        }
                     },
                     format: function(item)
                     {
                        return item.text;
                     },
                     mode: function()
                     {
                        return 's';
                     },
                     isMoreAllowed: function()
                     {
                        return 'asNeeded';
                     },
                     disableOpenSelectOnEnter: false,
                     click: _.noop,
                     isClearAllowed: _.noop,
                     isStrict: function ()
                     {
                        return true;
                     },
                     parse: _.noop,
                     itemTemplate: '',
                     itemPopupTemplate: '',
                     popupCustomClass: '',
                     alignWidth: false,
                     moreTemplate: '',
                     morePosition: 'r',
                     moreExtendScope: {data: {}},
                     debounce: 0,
                     minimumInputLength: 1,
                     maximumInputLength: ''
                  });

                  if (!_options.i18n)
                  {
                     _options.i18n = {};
                  }

                  _.defaults(_options.i18n, {
                     placeholder: '',
                     moreTooltipText: 'More',
                     filterPopupPlaceholder: 'No result'
                  });

                  if (ctrl)
                  {
                     ctrl.$render = function()
                     {
                        var ngModel = ctrl.$modelValue;
                        var index;
                        if (ngModel || ngModel === 0)
                        {
                           index = _getItemIndex(scope.getItems(), ngModel);
                           if (scope.mode === 's')
                           {
                              _selectItem(ngModel);
                           }

                           if (scope.mode === 't')
                           {
                              _setActiveTab(index);
                           }
                        }
                        if (scope.mode === 'f')
                        {
                           _setFilterItem(ngModel);
                        }
                     };
                  }

                  function _getItemIndex(data, ngModel)
                  {
                     var index = -1;

                     if (ngModel)
                     {
                        index = _.findIndex(data, function(item, itemIndex)
                        {
                           return ngModel === item || scope.getId(ngModel) === scope.getId(item, itemIndex) || scope.format(ngModel) === scope.format(item);
                        });
                     }
                     return index;
                  }

                  function _initSelection(mode)
                  {
                     var _data = scope.getItems();
                     if (_data && _data.length >= 0 && mode !== 'a')
                     {
                        var index;
                        var ngModel = scope.$eval(attr.ngModel);
                        index = _getItemIndex(_data, ngModel);


                        if (index !== -1)
                        {
                           if (mode === 'f')
                           {
                              _setFilterItem(_data[index]);
                           }
                           else
                           {
                              _selectItem(_data[index]);
                           }
                        }
                        else
                        {
                           if (mode === 'f')
                           {
                              _setFilterItem(ngModel);
                           }

                           scope.selectedItemText = swI18nService.getResource(_options.i18n.placeholder);
                        }
                     }
                  }

                  scope.isTouchInput = swFeatureDetector.isTouchInput();

                  function _isQueryExist()
                  {
                     return _options.query !== _.noop;
                  }

                  function _isClearAllowedInFilterMode()
                  {
                     return _options.isClearAllowed() && scope.filterScope.filterModel && scope.filterScope.filterModel.length;
                  }

                  function _getDefaultPlaceholderIfNeed(mode)
                  {
                     var placeholder = '';
                     if (_options.i18n.placeholder)
                     {
                        placeholder = _options.i18n.placeholder;
                     }
                     else
                     {
                        if (mode === 's')
                        {
                           placeholder = '-- Select --';
                        }
                     }
                     return placeholder;
                  }

                  function _initTabsMode()
                  {
                     var isMoreStr = _options.isMoreAllowed().toLowerCase();
                     scope.isMoreAllowed = isMoreStr === 'asneeded' || isMoreStr === 'always';
                     scope.isActionButton = _options.mode() === 'a';
                     scope.isMoreAllowedAlways = isMoreStr === 'always';
                  }

                  function _init()
                  {
                     scope.selection = {};
                     var mode = _options.mode();
                     if (mode === 'fs' && scope.isTouchInput && !_isQueryExist())
                     {
                        mode = 's';
                     }

                     switch (mode) {
                        case 's':
                           scope.mode = 's';
                           scope.isClearAllowed = _options.isClearAllowed;
                           scope.placeholder = swI18nService.getResource(_getDefaultPlaceholderIfNeed(mode));
                           _originalOptions.closePopup = function ()
                           {
                              if (_popup && !_popup.isHidden())
                              {
                                 _popup.hide();
                              }
                           };
                           break;
                        case 'a':
                        case 't':
                           scope.mode = 't';
                           _initTabsMode();
                           _originalOptions.update = function ()
                           {
                              _updateTabs();
                           };
                           break;
                        case 'f':
                        case 'fs':
                           mode = 'f';
                           scope.mode = 'f';
                           scope.debounce = _options.debounce;
                           scope.isClearAllowed = _isClearAllowedInFilterMode;
                           scope.filterPopupPlaceholder = swI18nService.getResource(_options.i18n.filterPopupPlaceholder);
                           scope.placeholder = swI18nService.getResource(_getDefaultPlaceholderIfNeed(mode));
                           scope.maximumInputLength = _options.maximumInputLength;
                           break;
                     }

                     _initSelection(mode);
                  }

                  scope.format = function(item)
                  {
                     return _options.format(item);
                  };

                  scope.getItems = function()
                  {
                     return _options.data() || [];
                  };

                  scope.getId = function(item, $index)
                  {
                     var id;
                     if (item)
                     {
                        id = _options.id(item);
                        if (!id && id !== 0)
                        {
                           id = $index;
                        }
                     }
                     else
                     {
                        id = $index;
                     }

                     return id;
                  };

                  scope.getDisabledClass = function ()
                  {
                     return (scope.disabled ? classNames.disabled : '');
                  };

                  /////////////////////////// select //////////////////////////////
                  scope.showList = function(e)
                  {
                     if (scope.disabled)
                     {
                        return;
                     }
                     var items = scope.getItems();
                     if ((items && items.length) || (scope.isClearAllowed() && scope.placeholder))
                     {
                        var target = e ? e.target : el.find('.sw-input-select_s-item-selected')[0];
                        _showPopup(target);
                     }
                  };

                  scope.delegateHotKeyOnSelect = function ()
                  {
                     var keys = {};
                     var keyStr = 'down' + (!_options.disableOpenSelectOnEnter ? ', enter' : '');
                     keys[keyStr] = function (event)
                     {
                        scope.$evalAsync(function ()
                        {
                           scope.showList(event.$event);
                        });
                     };

                     swHotKeyService.bind(el.find('.' + classNames.itemSelected), keys);
                  };

                  //////////////////////// Select & Tabs ////////////////////////////
                  function _showPopup(e)
                  {
                     var isAlignWidth = scope.mode === 's' && _options.alignWidth;
                     el.find('.' + (scope.mode === 's' ? classNames.itemSelected : classNames.moreBt)).addClass(classNames.popupActive);
                     _popup = swPopupService.show({
                        scope: scope,
                        target: e,
                        layout: {
                           of: e,
                           arrow: !isAlignWidth,
                           my: 'CT',
                           at: 'CB',
                           alignWidth: isAlignWidth,
                           margin: 3,
                           collision: {
                              rotate: false
                           }
                        },
                        customClass: (scope.mode === 's' ? classNames.selectPopup : classNames.tabsPopup) + ' ' + _options.popupCustomClass,
                        content: popupTemplate
                     });

                     _popup.promise.then(function()
                     {
                        el.find('.' + (scope.mode === 's' ? classNames.itemSelected : classNames.moreBt)).removeClass(classNames.popupActive);
                     });

                     return _popup;
                  }

                  function _selectItem(item)
                  {
                     if (item && item.disabled && item.disabled())
                     {
                        return;
                     }

                     if (item && item.click && _.isFunction(item.click))
                     {
                        item.click(item);
                     }

                     _options.click(item);

                     if (_.isEqual(item, scope.selection.item) && !scope.isActionButton)
                     {
                        return;
                     }

                     if (!_.isUndefined(item))
                     {
                        scope.selectedItemText = scope.format(item);
                     }
                     else
                     {
                        scope.selectedItemText = swI18nService.getResource(_options.i18n.placeholder);
                     }

                     scope.selection.item = item;

                     if (ctrl && !_isInit)
                     {
                        ctrl.$setViewValue(item);
                     }

                     _isInit = false;
                  }

                  scope.selectItemFromPopup = function(item)
                  {
                     if(!_.isUndefined(item) && item.disabled && item.disabled())
                     {
                        return;
                     }

                     _isInit = false;

                     if (scope.mode === 's')
                     {
                        _selectItem(item);
                        _popup.hide();
                     }
                     else
                     {
                        _selectTabFromPopup(item);
                     }
                  };

                  scope.getPopupItems = function()
                  {
                     return scope.mode === 's' ? scope.getItems() : scope.tabsPopupList;
                  };

                  scope.getPopupListClass = function()
                  {
                     return scope.mode === 's' ? classNames.selectPopupList : classNames.tabsPopupList;
                  };

                  scope.getItemClass = function(item)
                  {
                     var classStr = '';

                     if (item && item.disabled && item.disabled())
                     {
                        classStr = classNames.disabledPopupItem;
                     }

                     if (item === scope.selection.item)
                     {
                        classStr = !classStr ? classNames.selectItemActive : classStr + ' ' + classNames.selectItemActive;
                     }

                     return classStr;
                  };

                  scope.getItemPopupTemplate = function(item)
                  {
                     var template;
                     if (_options.itemPopupTemplate)
                     {
                        template = _options.itemPopupTemplate;
                     }
                     else if (_options.itemTemplate)
                     {
                        template = _options.itemTemplate;
                     }
                     else
                     {
                        template = scope.format(item);
                     }
                     return template;
                  };

                  ///////////////////////// Tabs ////////////////////////////////
                  var $tabs,
                     $tabsParent,
                     $moreBtn,
                     _needElementUpdate,
                     _isUpdateTabs;
                  var indexDataAttrName = 'data-tab-index';

                  function _updateTabs()
                  {
                     $tabs.find('.' + classNames.tabsItem + ', .' + classNames.moreBt).remove();
                     _isUpdateTabs = true;
                     scope.onElementResize();
                  }

                  scope.onElementResize = function()
                  {
                     var isItemInsert = false;
                     if (scope.mode === 'f' || (scope.mode === 's' && !_tempTabsWidth) || (_tabsPopupActive() && !_isUpdateTabs))
                     {
                        return;
                     }

                     if (
                        scope.mode === 's' &&
                        _tempTabsWidth &&
                        _tempTabsWidth[_findTabIndex(scope.getItems(), scope.selection.item)] + _tempTabsWidth.moreBtnWidth <= el.width()
                     )
                     {

                        _switchToTabsMode();
                        return;
                     }

                     if (_isUpdateTabs || _needElementUpdate || !$tabs || !$tabs.length)
                     {
                        isItemInsert = true;
                        _insertItems();
                        _isUpdateTabs = false;
                     }

                     if (!scope.isMoreAllowed && !scope.isActionButton)
                     {
                        _setFirstLastClass($tabs.find('li'));
                        return;
                     }

                     _closeTabsPopup();
                     scope.tabsPopupList = _.clone(scope.getItems());
                     if (!isItemInsert)
                     {
                        _processTabs();
                     }
                  };

                  function _tabsPopupActive()
                  {
                     return _popup && !_popup.isHidden();
                  }

                  function _closeTabsPopup()
                  {
                     if (_tabsPopupActive())
                     {
                        _popup.hide();
                     }
                  }

                  function _findTabIndex(data, tab)
                  {
                     return _.findIndex(data, function(val)
                     {
                        return scope.getId(val) === scope.getId(tab);
                     });
                  }

                  function _initEvent()
                  {
                     $tabs.on('click', '.' + classNames.tabsItem, function(e)
                     {
                        var $tab = $(e.currentTarget);
                        if ($tab.hasClass(classNames.disabledItem) || scope.disabled)
                        {
                           return;
                        }
                        _setActiveTab($tab);
                        if (scope.isMoreAllowed)
                        {
                           _processTabs();
                        }

                        scope.$apply(function()
                        {
                           _selectItem(scope.getItems()[$tab.data(indexDataAttrName)]);
                        });
                     });

                     $tabs.on('click', '.' + classNames.moreBt, function(e)
                     {
                        if (scope.disabled)
                        {
                           return;
                        }

                        scope.$apply(function()
                        {
                           _showPopup(e.target);
                        });
                     });
                  }

                  function _setActiveTab(elementOrIndex)
                  {
                     if (scope.isActionButton || !$tabs)
                     {
                        return;
                     }

                     $tabs.find('.' + classNames.tabsItem).removeClass(classNames.tabsActive);

                     var $el = _.isFinite(elementOrIndex) ? $tabs.find('.' + classNames.tabsItem).eq(elementOrIndex) : elementOrIndex;
                     $el.addClass(classNames.tabsActive);
                  }

                  function _hideItemsInPopup(map)
                  {
                     _.each(scope.tabsPopupList, function(item, index)
                     {
                        item.isHidden = !_.includes(map, index);
                     });
                  }

                  function _insertItems()
                  {
                     var activeTabIndex;
                     $tabs = el.find('.' + classNames.tabsList);
                     $tabsParent = el;
                     $tabs.css({opacity: 0});

                     if (!scope.isActionButton)
                     {
                        var ngModel = scope.$eval(attr.ngModel);
                        if (!ngModel)
                        {
                           ngModel = scope.selection.item;
                        }
                        var index = _.findIndex(scope.getItems(), function(item)
                        {
                           return ngModel === item;
                        });
                        if (index !== -1)
                        {
                           activeTabIndex = index;
                        }
                     }

                     _.each(scope.getItems(), function(item, index)
                     {
                        if (scope.isActionButton && item.popupOnly && item.popupOnly())
                        {
                           return;
                        }

                        var itemScope = scope.$new();
                        itemScope.item = item;
                        var element = $compile(
                           '<li tabindex="0" sw-hot-key-click data-ready="{{\'compiled\'}}" class="' + classNames.tabsItem + ' ' + (index === activeTabIndex ? classNames.tabsActive : '') +
                              ' {{getItemClass(item)}}" ng-disabled="item.disabled()"><div>' + (_options.itemTemplate ? _options.itemTemplate : '{{format(item)}}') + '</div></li>'
                        )(itemScope);

                        element.data(indexDataAttrName, index);
                        $tabs.append(element);
                     });

                     if (scope.isMoreAllowed)
                     {
                        var moreButtonScope = scope.$new();
                        moreButtonScope.data = _options.moreExtendScope.data;
                        var moreButtonTemplate = $compile(
                           '<li tabindex="0" sw-hot-key-click class="sw-popup-offset ' + classNames.moreBt + '"><div>' + _options.moreTemplate + '</div></li>')(moreButtonScope);
                        $tabs[_options.morePosition === 'l' ? 'prepend' : 'append'](moreButtonTemplate);
                        $moreBtn = $tabs.find('.' + classNames.moreBt);
                        swTooltipService.tooltip($moreBtn, {text: _options.i18n.moreTooltipText});
                     }

                     if (!_isUpdateTabs)
                     {
                        _initEvent();
                     }

                     var onDirectiveLoad = function () {
                        $timeout(function () {
                           if ($tabs.find('li').attr('data-ready') === 'compiled') {
                              _processTabs();
                              $tabs.css({opacity: 1});
                              return;
                           }
                           onDirectiveLoad();
                        });
                     };

                     onDirectiveLoad();

                     _needElementUpdate = false;
                  }

                  function _setFirstLastClass($items)
                  {
                     var visibleItem = $items.filter(':visible');
                     visibleItem.eq(0).addClass(classNames.tabsFirstVisible);
                     visibleItem.eq(visibleItem.length - 1).addClass(classNames.tabsLastVisible);
                  }

                  function _selectTabFromPopup(tab)
                  {
                     var data = scope.tabsPopupList;
                     var index = _findTabIndex(data, tab);

                     _selectItem(tab);
                     _setActiveTab(index);
                     _processTabs();

                     _closeTabsPopup();
                  }

                  function _switchToSelectMode(widths)
                  {
                     scope.$apply(function()
                     {
                        $tabs.find('.' + classNames.tabsItem).each(function(/*jshint unused:true */index, el)
                        {
                           var childScope = $(el).scope();
                           if (childScope)
                           {
                              childScope.$destroy();
                           }
                           else
                           {
                              throw new Error('scope must exist');
                           }
                        });
                        _tempTabsWidth = widths;
                        scope.mode = 's';
                     });
                  }

                  function _switchToTabsMode()
                  {
                     scope.$apply(function()
                     {
                        _tempTabsWidth = null;
                        scope.mode = 't';
                        scope.onElementResize();
                        _needElementUpdate = true;
                     });
                  }

                  var _getHiddenElMap = function()
                  {
                     return $(this).data(indexDataAttrName);
                  };

                  var _getItemsWidthMap = function()
                  {
                     return this.offsetWidth;
                  };

                  function _calcLastTabIndex($items, tabsParentWidth)
                  {
                     var width = 0;

                     for (var i = 0, itemsLength = $items.length; i < itemsLength; i++) {
                        width += $items.eq(i).outerWidth();
                        if (width > tabsParentWidth)
                        {
                           return i;
                        }
                     }
                  }

                  function _processTabs()
                  {
                     var $items = $tabs.find('.' + classNames.tabsItem);
                     var $allItems = $tabs.find('li');
                     var $activeTab = $items.filter('.' + classNames.tabsActive);
                     var $hiddenBlocks = $tabs.find('.hideable');
                     var isActiveTabExists = !!$activeTab.length;
                     var isHiddenBlocksExists = !!$hiddenBlocks.length;
                     var tabsParentWidth = $tabsParent.width()  - ($moreBtn && scope.isMoreAllowedAlways ? $moreBtn.outerWidth() : 0);
                     var activeTabWidth = isActiveTabExists ? $activeTab.outerWidth() : 0;

                     $items.show();
                     $items.removeClass(classNames.tabsFirstVisible + ' ' + classNames.tabsLastVisible);
                     if ($moreBtn)
                     {
                        $moreBtn.removeClass(classNames.tabsFirstVisible + ' ' + classNames.tabsLastVisible);
                        $moreBtn.hide();
                     }

                     if (isHiddenBlocksExists)
                     {
                        $hiddenBlocks.show();
                        $hiddenBlocks.closest('li').removeClass(classNames.tabsItemCollapsed);
                     }

                     var lastTabIndex = _calcLastTabIndex($items, tabsParentWidth);

                     if ($items.length - 1 >= lastTabIndex)
                     {
                        if (isHiddenBlocksExists)
                        {
                           $hiddenBlocks.hide();
                           $hiddenBlocks.closest('li').addClass(classNames.tabsItemCollapsed);
                        }

                        if (scope.isMoreAllowed)
                        {
                           $moreBtn.show();

                           var moreBtnWidth = $moreBtn.outerWidth();

                           if (activeTabWidth + moreBtnWidth > tabsParentWidth)
                           {
                              var widthMap = $items.map(_getItemsWidthMap).get();
                              widthMap.moreBtnWidth = moreBtnWidth;
                              _switchToSelectMode(widthMap);
                           }
                           else
                           {
                              var widthWithoutMore = tabsParentWidth - moreBtnWidth;
                              var lastTabIndexWithMore = _calcLastTabIndex($items, widthWithoutMore);
                              var $hiddenEl;

                              if ($activeTab.data(indexDataAttrName) >= lastTabIndexWithMore)
                              {
                                 widthWithoutMore -= activeTabWidth;
                                 lastTabIndexWithMore = _calcLastTabIndex($items, widthWithoutMore);
                              }

                              if (isHiddenBlocksExists || scope.isMoreAllowedAlways)
                              {
                                 $hiddenEl = $items.eq(lastTabIndexWithMore + (scope.isMoreAllowedAlways ? 1 : 0)).nextAll('.' + classNames.tabsItem).addBack()
                                                   .not('.' + classNames.tabsActive);
                              }
                              else
                              {
                                 $hiddenEl = $items.eq(lastTabIndexWithMore).nextAll('.' + classNames.tabsItem).addBack().not('.' + classNames.tabsActive);
                                 var idsMap = $hiddenEl.map(_getHiddenElMap).get();
                                 _hideItemsInPopup(idsMap);
                              }
                              $hiddenEl.hide();
                           }
                        }
                     }
                     else if (scope.isMoreAllowed && scope.isMoreAllowedAlways)
                     {
                        $moreBtn.show();
                     }

                     _setFirstLastClass($allItems);
                  }

                  ////////////////////////// Tabs end ////////////////////////


                  ///////////////////////// Filter //////////////////////////
                  var _savedScrollTop = 0;
                  var _filterElement;
                  var _notRestoreScrollPosition = false;
                  var _isFocused = false;
                  var _isBlur = false;
                  var _isUpdated = false;

                  scope.activeIndex = 0;

                  var filterPopup;
                  var popupScroll;
                  function _openFilterPopup()
                  {
                     el.find('.' + classNames.filterArrow).addClass(classNames.popupActive);
                     filterPopup = swPopupService.show({
                        scope: scope,
                        layout: {
                           of: el.find('.' + classNames.filterInput)[0],
                           my: 'LT',
                           at: 'LB',
                           alignWidth: true,
                           margin: 3,
                           collision: {
                              rotate: false
                           }
                        },
                        requestFocus: false,
                        customClass: classNames.filterPopup + ' ' + _options.popupCustomClass,
                        content: filterPopupTemplate
                     });

                     filterPopup.readyPromise.then(function ()
                     {
                        popupScroll = swScrollFactory.getParentScroll($('.' + classNames.filterPopupList));

                        if (scope.filterScope.filterModel)
                        {
                           _isUpdated = false;
                        }
                     });

                     filterPopup.promise.then(function ()
                     {
                        popupScroll = null;
                        el.find('.' + classNames.filterArrow).removeClass(classNames.popupActive);
                        if (!_notRestoreScrollPosition && scope.isTouchInput)
                        {
                           scope.activeIndex = null;
                           _restoreScrollPosition();
                        }
                        else
                        {
                           _notRestoreScrollPosition = false;
                        }

                        if (
                           _isBlur &&
                           (_isUpdated && (scope.filterScope.filterResult || scope.filterScope.filterResult.length))
                        )
                        {
                           _clearOldFilter();
                           _setFilterItem( (_isFreeText() ? _filterElement.value : null) );
                        }
                     });
                  }

                  function _isPopupVisible()
                  {
                     return filterPopup && !filterPopup.isHidden();
                  }

                  function _openFilterPopupIfNeed()
                  {
                     if (!_isPopupVisible())
                     {
                        _openFilterPopup();
                     }
                     else
                     {
                        filterPopup.layout();
                     }
                  }

                  function _closeFilterPopup()
                  {
                     if (_isPopupVisible())
                     {
                        filterPopup.hide(null);
                     }
                  }

                  function _isFreeText()
                  {
                     return _options.parse !== _.noop;
                  }

                  function _setFilterItem(item)
                  {
                     var isClear = !_isFreeText() && !_isUpdated && ctrl;
                     var parseItem = (item && _isFreeText() && _.isString(item)) ? _options.parse(item) : item;
                     if (ctrl && !_isInit && !isClear && _isUpdated)
                     {
                        ctrl.$setViewValue(parseItem === '' ? null : parseItem);
                        _isInit = false;
                     }
                     else  //TODO: Hack. Will be remove after refactoring
                     {
                        if (ctrl && !_isInit && !_isUpdated && _isFreeText() && scope.filterScope.filterModel === '')
                        {
                           ctrl.$setViewValue(null);
                        }
                     }

                     if (_isInit)
                     {
                        _isInit = false;
                        _isUpdated = true;
                     }


                     var value = isClear ? ctrl.$modelValue : item;
                     scope.filterScope.filterModel = value && !_.isString(value) ? scope.format(value) : value;
                  }

                  function _restoreScrollPosition()
                  {
                     if (scope.isTouchInput)
                     {
                        swApplicationScroll.setScrollTop(_savedScrollTop);
                        $('.' + classNames.filterExpander).height(0);
                     }
                  }

                  function _query(querySequence, params)
                  {
                     return _options.query(params).then(function(data)
                     {
                        return {
                           data: data,
                           querySequence: querySequence
                        };
                     });
                  }

                  function _setActiveClass(index)
                  {
                     if (!scope.isTouchInput)
                     {
                        $('.' + classNames.filterPopupSelectedItem).removeClass(classNames.filterPopupSelectedItem);
                        $('.' + classNames.filterPopupItem).eq(index).addClass(classNames.filterPopupSelectedItem);
                     }
                  }

                  var prevActiveIndex;
                  function _setActiveIndex(index, itemsLength)
                  {
                     scope.activeIndex += index;
                     if (scope.activeIndex < 0)
                     {
                        scope.activeIndex = itemsLength - 1;
                     }

                     if (scope.activeIndex >= itemsLength)
                     {
                        scope.activeIndex = 0;
                     }

                     _setActiveClass(scope.activeIndex);

                     if (popupScroll)
                     {
                        var $selectedItem = $('.' + classNames.filterPopupSelectedItem);
                        popupScroll.scrollIntoViewIfNeeded($selectedItem[0], prevActiveIndex > scope.activeIndex);
                        prevActiveIndex = scope.activeIndex;
                     }
                  }

                  var _oldFilter;
                  function _clearOldFilter()
                  {
                     if (_oldFilter)
                     {
                        _oldFilter = '';
                     }
                  }

                  function _clearQueryList()
                  {
                     if (scope.getItems().length)
                     {
                        scope.filterScope.filterResult = scope.getItems();
                     }
                     else
                     {
                        scope.filterScope.filterResult = [];
                        _closeFilterPopup();
                     }
                  }

                  var _scrollOnTouch;
                  function _scrollInToucheIfNeeded()
                  {
                     if (scope.isTouchInput && _scrollOnTouch !== undefined)
                     {
                        swApplicationScroll.setScrollTop(_scrollOnTouch);
                     }
                  }

                  scope.setSelection = function (e)
                  {
                     if (scope.isTouchInput)
                     {
                        return;
                     }

                     var itemsLength = scope.filterScope.filterResult ? scope.filterScope.filterResult.length : 0;

                     switch (e.which) {
                        case 40:
                           _setActiveIndex(1, itemsLength);
                           e.preventDefault();
                           if (!_isPopupVisible())
                           {
                              scope.handleFilter();
                           }
                           break;
                        case 38:
                           _setActiveIndex(-1, itemsLength);
                           e.preventDefault();
                           break;
                        //case 9:
                        case 27:
                           _isBlur = false;
                           _closeFilterPopup();
                           break;
                        case 13:
                           if (_isPopupVisible())
                           {
                              _isUpdated = true;
                              if (!scope.filterScope.filterResult.length && _isFreeText())
                              {
                                 _setFilterItem(e.target.value);
                              }
                              else
                              {
                                 _setFilterItem(scope.filterScope.filterResult[scope.activeIndex]);
                              }
                              _isBlur = false;
                              _notRestoreScrollPosition = true;
                              _closeFilterPopup();
                           }
                           break;
                     }
                  };

                  scope.setSelectionClick = function (index)
                  {
                     _isBlur = false;
                     _isUpdated = true;
                     _setFilterItem(scope.filterScope.filterResult[index]);
                     _closeFilterPopup();
                  };

                  scope.setActiveIndexOnHover = function (index)
                  {
                     scope.activeIndex = index;
                     _setActiveClass(scope.activeIndex);
                  };

                  scope.setFocusOnFilter = function (e)
                  {
                     if (scope.disabled)
                     {
                        return;
                     }
                     el.find('.' + classNames.filterInput).focus();
                     _isFocused = true;
                     $timeout(function ()
                     {
                        scope.handleFilter(e);
                     });
                  };

                  scope.clearModel = function ()
                  {
                     if (scope.disabled)
                     {
                        return;
                     }
                     _isUpdated = true;
                     _setFilterItem(null);
                     scope.filterScope.filterModel = '';
                  };

                  var querySequence = 0;
                  scope.handleFilter = function (e)
                  {
                     if (!_isFocused)
                     {
                        return;
                     }

                     if (!scope.filterScope.filterModel && ((scope.getItems() && scope.getItems().length) || !_isQueryExist()))
                     {
                        _clearOldFilter();
                        _isUpdated = true;
                        scope.filterScope.filterResult = scope.getItems();
                        scope.activeIndex = 0;
                        if (scope.filterScope.filterResult.length)
                        {
                           _openFilterPopupIfNeed();
                        }
                        return;
                     }

                     var isStrict = _options.isStrict();

                     if (_isQueryExist())
                     {
                        if (!scope.filterScope.filterModel || !scope.filterScope.filterModel.length)
                        {
                           _clearQueryList();
                           return;
                        }

                        if ((scope.filterScope.filterModel && scope.filterScope.filterModel.length >= _options.minimumInputLength) || _options.minimumInputLength === 0)
                        {
                           _isUpdated = false;
                           scope.showLoader = true;
                           querySequence++;
                           _query(querySequence, scope.filterScope.filterModel).then(function (queryData)
                           {
                              if (queryData.querySequence === querySequence)
                              {
                                 if (!scope.filterScope.filterModel || !scope.filterScope.filterModel.length)
                                 {
                                    _clearQueryList();
                                    return;
                                 }

                                 scope.activeIndex = 0;
                                 scope.filterScope.filterResult = queryData.data;
                                 _openFilterPopupIfNeed();
                                 scope.showLoader = false;
                              }
                           });
                        }
                     }
                     else
                     {
                        if (!e)
                        {
                           _isUpdated = _isFreeText() && (_oldFilter !== scope.filterScope.filterModel);

                           var regEx = new RegExp((isStrict ? '^' : '') + _.escapeRegExp(scope.filterScope.filterModel),'i');
                           var result = _.filter(scope.getItems(), function (val)
                           {
                              return regEx.test(scope.format(val));
                           });
                           if (result.length || _isFreeText() || !isStrict)
                           {
                              _oldFilter = scope.filterScope.filterModel;
                              scope.activeIndex = 0;
                              scope.filterScope.filterResult = result;
                           }
                           else
                           {
                              if (!scope.filterScope.filterModel)
                              {
                                 _clearOldFilter();
                              }
                              scope.filterScope.filterModel = _oldFilter;
                              scope.handleFilter();
                           }
                        }
                        else
                        {
                           scope.filterScope.filterResult = scope.getItems();
                        }

                        _scrollInToucheIfNeeded();
                        _openFilterPopupIfNeed();
                     }

                  };

                  scope.focusOnFilter = function (e)
                  {
                     _isFocused = true;

                     if (scope.isTouchInput)
                     {
                        var $expander = $('.' + classNames.filterExpander);
                        if ( !$expander.length )
                        {
                           $expander = $('<div/>');
                           $expander.addClass(classNames.filterExpander);
                           $('body').append($expander);
                        }

                        $expander.height(0);

                        var scrollTo = el.offset().top - swStickyService.getStickyHeightOver(swApplicationScroll.getScroll());
                        var canBeScroll = swApplicationScroll.getScrollHeight() - swApplicationScroll.getScrollTop() - swLayoutManager.context().viewport.height;
                        var needToScroll = scrollTo - swApplicationScroll.getScrollTop();
                        var needToAdd = needToScroll - canBeScroll;

                        if (needToScroll > canBeScroll)
                        {
                           var expanderOffsetTop = $expander.offset().top;
                           var viewportHeight = swLayoutManager.context().viewport.height;
                           needToAdd += expanderOffsetTop > viewportHeight ? viewportHeight : viewportHeight - expanderOffsetTop;
                        }

                        if (needToAdd > 0)
                        {
                           $expander.height(needToAdd);

                        }
                        _savedScrollTop = swApplicationScroll.getScrollTop();
                        _scrollOnTouch = scrollTo;
                     }

                     if (e.target.value.length)
                     {
                        e.target.setSelectionRange(0, e.target.value.length);
                     }

                     _filterElement = e.target;
                  };

                  scope.blurFromFilter = function (e)
                  {
                     _isFocused = false;
                     _isBlur = true;
                     _filterElement = e.target;
                     _scrollOnTouch = undefined;

                     if (!_isPopupVisible())
                     {
                        _restoreScrollPosition();

                        if (!_isUpdated)
                        {
                           _clearOldFilter();
                           _setFilterItem( (_isFreeText() ? _filterElement.value : null) );
                        }
                     }
                  };

                  ///////////////////////// Filter end //////////////////////

                  _init();

                  attr.$observe('disabled', function(value)
                  {
                     // disabled="{{expr}}" - value is string
                     // ng-disabled="expr"  - value is boolean
                     if ( _.isString(value) )
                     {
                        value = value.toLowerCase() === 'true' || value.toLowerCase() === 'disabled';
                     }
                     scope.disabled = value;
                  });

                  el.on('$destroy', function ()
                  {
                     if (scope.mode === 'f')
                     {
                        $('.' + classNames.filterExpander).remove();
                     }

                     if (_originalOptions.closePopup)
                     {
                        delete _originalOptions.closePopup;
                     }

                     if (_originalOptions.update)
                     {
                        delete _originalOptions.update;
                     }
                  });
               };
            }
         };
      }]);
});