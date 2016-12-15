/**
 * Specific input combo component that could be represented as
 *    - ordinary text input
 *    - ordinary select input   
 *    - ordinary text input with custom popup to filter/select choices
 *
 * Component is based on "ng-model" and so supports "ng-change", validation etc. 
 * 
 * Usage:
 * 
 *   <sw-input-combo options="expr" ng-model="expr"></sw-input-combo>
 *   
 *      "options" expression should be evaluated to an object:
 *      
 *      data:   function() { return ...; },
 *         function returns array of items (choices)
 *         default: empty array
 *      
 *      id:     function(item) { return ...; },
 *         function converts item to identity (similar to angular "track by")
 *         default: item.id
 *         If item is empty then id is '' 
 *      
 *      format: function(item) { return ...; },
 *         function converts item to text to be displayed
 *         default: item.id 
 *         If item is empty then text is '' for inputs and 'i18n.emptyValue' for popup choice 
 *      
 *      parse:  function(text) { return ...; }
 *         function converts text to item
 *         default: no
 *         ///////////////////////////////////////////////////
 *         must be specified so that FREE TEXT to be supported
 *         ///////////////////////////////////////////////////
 *      
 *      isClearAllowed: function() { return true|false; },
 *         function returns boolean
 *         default: true
 *      
 *      i18n.placeholder: '...', // default: 'Type to filter'
 *      i18n.notFound:    '...', // default: 'Not Found' 
 *      i18n.emptyValue:  '...', // default: 'Empty value'
 *         language resources keys
 *
 *      mode: function() { return '...'; }
 *         function returns the mode:
 *           'p' - custom popup
 *           's' - select
 *         by default the following strategy is used:
 *           'p' - if number of choices > 10
 *           's' - otherwise
 *              
 *      Note that:
 *         - if number of choices is 0
 *              then ordinary text input _without_ custom popup is used regardless of mode()
 *         - if FREE TEXT is supported (parse() is specified)
 *              then ordinary text input _with_    custom popup is used regardless of mode()
 * 
 * Example 1
 *  
   <sw-input-combo
      options="getMicroSourceOptions(micro)"
      name="source{{$index}}"
      ng-model="micro.microSource"
      ng-change="micro.microSite = null"
      sw-required="true"
   ></sw-input-combo>
   <span sw-error-for-name="'source'+$index"></span>
            
   $scope.getMicroSourceOptions = function(micro)
   {
       return {
          data:   function() { return micro.allowedMicroSources; },
          format: function(item) { return formatIdDashName(item); }
       };
   };
 *  
 * 
 * Example 2
 *  
   <sw-input-combo
      options="getMicroSiteOptions(micro)"
      ng-model="micro.microSite"
   ></sw-input-combo>
            
   $scope.getMicroSiteOptions = function(micro)
   {
      return {
         data:   function() { return micro.microSource && micro.microSource.sites; },
         id:     function(item) { return item; },
         format: function(item) { return item; },
         parse:  function(text) { return text; }
      };
   };
 *  
 * 
 * Example 3
 *  
   <sw-input-combo
      options="getQuestionOptions(question)"
      name="question{{$index}}"
      ng-model="question.answer"
      sw-required="question.required"
   ></sw-input-combo>
   <span sw-error-for-name="'question'+$index"></span>
                     
   $scope.getQuestionOptions = function(question)
   {
      return {
         data:   function() { return question.predefinedAnswers; },
         id:     function(item) { return item.choice; },
         format: function(item) { return item.choice; },
         parse:  function(text) { return { choice: text }; },
      };
   };
 *  
 *  
 */
define([

   'module',
   'underscore',
   'angular',
   'ngModule',
   'swLoggerFactory',
   'text!./InputCombo.html',
   'text!./InputComboPopupHeader.html',
   'text!./InputComboPopupContent.html',
   'less!./InputCombo'

   ], function(

   module,
   _,
   ng,
   ngModule,
   swLoggerFactory,
   template,
   templatePopupHeader,
   templatePopupContent

   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swInputCombo', ['swI18nService', 'swPopupService', function(swI18nService, swPopupService)
   {
      logger.trace('register');
      
      return {
         restrict: 'E',
         template: template,
         replace: true,
         scope: true,
         require: 'ngModel',
         compile: function()
         {
            return function(scope, element, attr, ctrl)
            {
               /*jshint unused:false */
               
               var _options = _.clone(scope.$eval(attr.options));
               if ( !_options )
               {
                  throw new Error('sw-input-combo: \'options\' attribute should be specified');
               }
               
               _.defaults(_options, {
                  
                  data:   _.noop,
                  id:     function(item) { return item.id; },
                  format: function(item) { return item.id; },
                  parse:  _.noop,
                  
                  isClearAllowed: function() { return true; },
                  
                  i18n: {
                     placeholder: 'Type to filter',
                     notFound:    'Not Found',
                     emptyValue:  ''
                  },
                  
                  mode: function()
                  {
                     var len = (this.data() || []).length;
                     return len > 10 ? 'p' : 's';
                  }
                  
               });
               
               ////////////////////////////////////////////////////////////////

               scope.getItems = function()
               {
                  return _options.data() || [];
               };
                  
               scope.isClearAllowed = function()
               {
                  return _options.isClearAllowed();
               };
               
               scope.isFreetextAllowed = function()
               {
                  return _options.parse !== _.noop;
               };
               
               scope.isButtonVisible = function()
               {
                  return scope.getItems().length > 0;
               };
               
               scope.isPopupMode = function()
               {
                  var l = scope.getItems().length;
                  var m = _options.mode();
                  var f = scope.isFreetextAllowed();
                  return l  >  0 && (m === 'p' ||  f);
               };
               
               scope.isSelectMode = function()
               {
                  var l = scope.getItems().length;
                  var m = _options.mode();
                  var f = scope.isFreetextAllowed();
                  return l  >  0 &&  m === 's' && !f;
               };
               
               ////////////////////////////////////////////////////////////////
               
               scope.i18n = _options.i18n;
               
               scope.id = function(item)
               {
                  return !_.isEmpty(item) ? _options.id(item) : '';
               };
               
               scope.format = function(item)
               {
                  return !_.isEmpty(item) ? _options.format(item) : '';
               };
               
               scope.formatChoice = function(item)
               {
                  return !_.isEmpty(item) ? _options.format(item) : swI18nService.getResource(_options.i18n.emptyValue);
               };
               
               ////////////////////////////////////////////////////////////////

               scope._items = []; // filtered items
               
               scope.swInputComboValueHolder = {};
               
               var _popup;
               
               ////////////////////////////////////////////////////////////////

               ctrl.$render = function()
               {
                  var item = ctrl.$modelValue;
                  scope.swInputComboValueHolder.item = item;
                  scope.swInputComboValueHolder.text = scope.format(item);
               };
               
               // item is 'undefined' -> select current item  
               // item is 'null'      -> select empty   item  
               scope.changeItem = function(item)
               {
                  if ( _.isUndefined(item) )
                  {
                     item = scope.swInputComboValueHolder.item;
                  }
                  
                  scope.swInputComboValueHolder.item = item;
                  scope.swInputComboValueHolder.text = scope.format(item);
                  ctrl.$setViewValue(item);
                  
                  logger.trace('changeItem', item);
               };
               
               scope.changeText = function()
               {
                  var text = scope.swInputComboValueHolder.text;
                  var item = text ? _options.parse(text) : null;
                  scope.swInputComboValueHolder.item = item;
                  ctrl.$setViewValue(item);
                  
                  logger.trace('changeText', item);
               };
               
               ////////////////////////////////////////////////////////////////

               scope.inputClicked = function($event)
               {
                  if ( !scope.disabled && scope.isPopupMode() && !scope.isFreetextAllowed() )
                  {
                     _showPopup($event);
                  }
               };
               
               scope.buttonClicked = function($event)
               {
                  if ( !scope.disabled && scope.isPopupMode() )
                  {
                     _showPopup($event);
                  }
               };
               
               function _showPopup($event)
               {
                  scope.term = {value: ''};
                  
                  _filter();
                  
                  // To speed up popup opening in case when there are too many items
                  // we open it with first 20 items and then after popup is already
                  // on screen refresh it with all items.
                  var partial = false;
                  if ( scope._items.length > 20 )
                  {
                     partial = true;
                     scope._items = _.first(scope._items, 20);
                  }
                  
                  _popup = swPopupService.show({
                     scope: scope,
                     layout: {
                        of: $event.target,
                        my: 'RT',
                        at: 'LT',
                        margin: 10
                     },
                     customClass: 'sw-inputComboPopup',
                     header: templatePopupHeader,
                     content: templatePopupContent
                  });
                  
                  if ( partial )
                  {
                     _popup.readyPromise.then(function()
                     {
                        scope.filter();
                     });
                  }
               }
               
               function _filter()
               {
                  var term = scope.term.value;
                  
                  scope._items.splice(0);
                  
                  if ( !term && scope.isClearAllowed() )
                  {
                     scope._items.push(null);
                  }
                  
                  _.each(scope.getItems(), function(item)
                  {
                     if ( scope.format(item).toLowerCase().indexOf(term.toLowerCase()) !== -1 )
                     {
                        scope._items.push(item);
                     }
                  });
               }
               
               scope.filter = function()
               {
                  _filter();
               };
               
               scope.resetFilter = function()
               {
                  scope.term.value = '';
                  scope.filter();
               };
                  
               scope.isNotFound = function()
               {
                  return scope._items.length === 0;
               };
                  
               scope.select = function(item)
               {
                  scope.changeItem(item);
                  _popup.hide();
               };
                  
               scope.selectDefault = function()
               {
                  if ( scope._items.length >= 1 )
                  {
                     scope.select(scope._items[0]);
                  }
                  else if ( scope.term.value && scope.isFreetextAllowed() )
                  {
                     scope.select(_options.parse(scope.term.value));
                  }
               };
                  
               scope.isItemSelected = function(item)
               {
                  return scope.id(scope.swInputComboValueHolder.item) === scope.id(item);
               };
               
               ////////////////////////////////////////////////////////////////

               attr.$observe('disabled', function(value)
               {
                  // disabled="{{expr}}" - value is string
                  // ng-disabled="expr"  - value is boolean
                  if ( ng.isString(value) )
                  {
                     value = value.toLowerCase() === 'true';
                  }
                  scope.disabled = value;
               });
               
               ////////////////////////////////////////////////////////////////

            };
         }
      };
      
   }]);
});