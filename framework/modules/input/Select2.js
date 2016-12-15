/**
   
   Angular directive to adapt 'Select2' input control.
   See http://ivaynberg.github.com/select2/
      
   Note that this directive is class-restricted
   (appropriate class is set by sw-select2/sw-input directive - see Input.js).
   
   Usage:
      <sw-select2              sw-select2-options="expr" ng-model="selection-expr"></sw-select2>
      <sw-input type="select2" sw-select2-options="expr" ng-model="selection-expr"></sw-input>
      
   'sw-select2-options' attribute must be specified and point to select2 constructor options
   (see details at http://ivaynberg.github.com/select2/#documentation).
   
   'ng-model' attribute must be specified and point to the object (or array) which contain selection.
   Array must be used if multiple selection is allowed in options.
   
   Directive supports 'data' and 'query' select2 options but does not support 'ajax' one.
   Besides the ones described in documentation, you can additionally specify the following options:

      swObjectToItem: function(obj)
        By default select2 assumes that data item is an object with 'id' and 'text' properties.
        This function is intended for the cases when your data objects should be adapted to
        this assumption.
        - 'obj' is your data object
        - return object with id/text properties
        Note that converter keeps reference to your original object and so reverse conversion
        function is not needed.
        If you use 'options.createSearchChoice' to support free-text choices then
        please return '$object' property to convert those free-text choices to model objects.
        For example:  
            createSearchChoice: function(term)
            {
               return {id: term, text: term, $object: {id: term, name: term}};
            }
        
      swQueryDefaultData: []
        If this property is specified, its value is returned by select2 'query.callback()'
        in case when entered search string is empty. Value should be specified using the
        same rules as 'data' option (including hierarchical structure).
        
      swSelection property in 'query' function parameter
         var lookupOptions = {
            query: function(options) {
               logger.debug(options.swSelection.length); // current selection length

   
*/
define([

   'module',
   'jquery',
   'underscore',
   'angular',
   'ngModule',
   'swLoggerFactory',
   'select2',
   'css!select2'

   ], function(

   module,
   $,
   _,
   ng,
   ngModule,
   swLoggerFactory

   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swInputSelect2', [
                                         
      'swI18nService',
      '$timeout',
      'swLongRunningOperation',
      
   function(
         
      swI18nService,
      $timeout,
      swLongRunningOperation
      
   )
   {
      logger.trace('register');
      
      function setDefaults()
      {
         ng.extend($.fn.select2.defaults,
         {
            formatNoMatches: function(term)
            {
               return swI18nService.getResource('Select2.NoMatches', {term: term});
            },
            formatInputTooShort: function(input, min)
            {
               return swI18nService.getResource('Select2.InputTooShort', {more: (min - input.length)});
            },
            formatSelectionTooBig: function(limit)
            {
               return swI18nService.getResource('Select2.SelectionTooBig', {limit: limit});
            },
            formatLoadMore: function(pageNumber)
            {
               return swI18nService.getResource('Select2.LoadMore', {pageNumber: pageNumber});
            },
            formatSearching: function()
            {
               return swI18nService.getResource('Select2.Searching');
            },
            dropdownCssClass: 'sw-input-select2-wrapper'
//          containerCssClass:
//          formatResultCssClass:
         });
      }
      
      setDefaults();
      
      return {
         restrict: 'C',
         require: 'ngModel',
         compile: function (element)
         {
            if ( !element.is('input[type=hidden]') )
            {
               throw new Error('\'sw-input-select2\' directive is applicable to "input[type=hidden]" only');
            }
            
            return function(scope, element, attr, controller)
            {
               var options = _.clone(scope.$eval(attr.swSelect2Options));
               if ( !options )
               {
                  throw new Error('\'sw-select2-options\' attribute should be specified');
               }
               
               controller.$render = function()
               {
                  // 3rd parameter should be 'false'
                  // see https://github.com/ivaynberg/select2/issues/1160
                  element.select2('data', convertObjectToItem(controller.$modelValue), false);
               };
      
               element.bind('change', function()
               {
                  scope.$apply(function()
                  {
                     controller.$setViewValue(convertItemToObject(element.select2('data')));
                  });
               });
               
               var unwatch = _.noop;
               if ( options.multiple )
               {
                  // ngModelController is $watch-ing the model without 3-rd 'true' parameter,
                  // and so it sees that selection is changed only if another array instance
                  // is set. If we just push/pop elements to/from selection then ngModelController
                  // does not see it. We have to introduce our own watcher:
                  unwatch = scope.$watch(
                        function()
                        {
                           return controller.$modelValue;
                        },
                        function()
                        {
                           controller.$render();
                        },
                        true);
               }
               
               attr.$observe('disabled', function(value)
               {
                  // disabled="{{expr}}" - value is string
                  // ng-disabled="expr"  - value is boolean
                  if ( ng.isString(value) )
                  {
                     value = value.toLowerCase() === 'true';
                  }
                  element.select2('enable', !value);
               });
               
               function processOptions()
               {
                  if ( options.ajax )
                  {
                     throw new Error('\'ajax\' not supported');
                  }
                  
                  if ( options.query )
                  {
                     if ( _.isUndefined(options.minimumInputLength) )
                     {
                        options.minimumInputLength = 1;
                     }
                     
                     if ( !_.isEmpty(options.swQueryDefaultData) )
                     {
                        // if we have default data then show it immediately when user
                        // activate lookup, otherwise some characters should be entered
                        // to call server search.
                        options.minimumInputLength = 0;
                        options.query = queryDefaultDataWrapper(options.query, options.swQueryDefaultData);
                     }
                     
                     options.query = querySequenceWrapper(options.query);
                  }
                  
                  if ( options.swObjectToItem )
                  {
                     // if obj->item converter is specified then replace query/data in options
                     // so that select2 implementation works with converted objects.
                     
                     if ( options.query )
                     {
                        options.query = queryConversionWrapper(options.query);
                     }
                     else if ( options.data )
                     {
                        options.data = convertObjectToItem(options.data);
                     }
                  }
               }
               
               function queryDefaultDataWrapper(query, defaultData)
               {
                  var queryOrig = query;
                  return function(options)
                  {
                     options.term = options.term.trim();
                     if ( options.term.length === 0 )
                     {
                        options.callback({results: defaultData || []});
                     }
                     else
                     {
                        queryOrig(options);
                     }
                  };
               }
               
               function querySequenceWrapper(query)
               {
                  var timeout; // current scheduled but not yet executed request
                  var requestSequence = 0; // sequence used to drop out-of-order responses
                  var quietMillis = options.quietMillis || 250;

                  var queryOrig = query;
                  return function(options)
                  {
                     logger.trace('query  >', requestSequence);
                     
                     $timeout.cancel(timeout);
                     timeout = $timeout(function()
                     {
                        requestSequence++;
                        var requestNumber = requestSequence;

                        logger.trace('query >>', requestSequence, requestNumber);
                        
                        var callbackOrig = options.callback;
                        options.callback = function(result)
                        {
                           if ( requestNumber === requestSequence )
                           {
                              logger.trace('query ++', requestSequence, requestNumber);
                              return callbackOrig(result);
                           }
                           else
                           {
                              logger.trace('query --', requestSequence, requestNumber);
                           }
                        };
                        
                        // selection wrapper //////////////////////////////////////////////////////
                        options.swSelection = convertItemToObject(options.element.select2('data'));
                        ///////////////////////////////////////////////////////////////////////////
                        
                        swLongRunningOperation.suspend();
                        queryOrig(options);
                        swLongRunningOperation.resume();
                        
                     },
                     quietMillis);
                  };
               }
               
               function queryConversionWrapper(query)
               {
                  var queryOrig = query;
                  return function(options)
                  {
                     var callbackOrig = options.callback;
                     options.callback = function(result)
                     {
                        result.results = convertObjectToItem(result.results);
                        return callbackOrig(result);
                     };
                     return queryOrig(options);
                  };
               }
               
               function convertObjectToItem(src)
               {
                  var dst = src;
                  if ( options.swObjectToItem )
                  {
                     if ( ng.isArray(src) )
                     {
                        dst = [];
                        ng.forEach(src, function(object)
                        {
                           var item = options.swObjectToItem(object);
                           item.$object = object; // keep reference to original object
                           if ( object.children )
                           {
                              item.children = convertObjectToItem(object.children);
                           }
                           dst.push(item);
                        });
                     }
                     else
                     {
                        if ( src )
                        {
                           dst = options.swObjectToItem(src);
                           dst.$object = src; // keep reference to original object
                        }
                     }
                  }
                  return dst;
               }
               
               function convertItemToObject(src)
               {
                  var dst = src;
                  if ( options.swObjectToItem )
                  {
                     if ( ng.isArray(src) )
                     {
                        dst = [];
                        ng.forEach(src, function(item)
                        {
                           if ( !item.$object )
                           {
                              throw new Error('sw-select2: createSearchChoice: \'$object\' property should be specified in returned item');
                           }
                           dst.push(item.$object);
                        });
                     }
                     else
                     {
                        if ( src && !src.$object )
                        {
                           throw new Error('sw-select2: createSearchChoice: \'$object\' property should be specified in returned item');
                        }
                        dst = src && src.$object;
                     }
                  }
                  return dst;
               }
               
/////////////////////////////////////////////////////////////////////////////////////////
               
               processOptions();
               element.select2(options);
               
               // 3rd parameter should be 'false'
               // see https://github.com/ivaynberg/select2/issues/1160
               element.select2('data', convertObjectToItem(scope.$eval(attr.ngModel)), false); // initial selection
               
               element.on('$destroy', function()
               {
                  element.select2('destroy');
                  unwatch();
               });
               
/////////////////////////////////////////////////////////////////////////////////////////
               
               // This is a workround for
               // https://github.com/ivaynberg/select2/issues/1541 "Virtual keyboard showing up always"
               // The problem is that select2 set appropriate class (select2-search-hidden)
               // for dropdown, but it does not set one for main container.
               // We need some marker class on main container to disable select2 "focusser".
               // See Input.less: we use these marker classes to hide focusser and search inputs.
               if ( options.minimumResultsForSearch === -1 )
               {
                  element.addClass('sw-input-select2-search-hidden');
               }
               
/////////////////////////////////////////////////////////////////////////////////////////
               
// Unfortunately, solution below has side effect:
//    selection by mouse does not work.               
               
//               // Select2 dropdown is closed when user clicks on "select2-drop-mask".
//               // When client-server communication error occurs in 'options.query()'
//               // then MessageBox is shown but dropdown is not closed as there was no clicks.
//               // So we need special processing to close dropdown in such a case.
//               // We use 'blur' as MessageBox requests focus.
//               element.bind('select2-blur', function()
//               {
//                  $timeout(function()
//                  {
//                     element.select2('close');
//                  }, 0, false);
//               });
            
/////////////////////////////////////////////////////////////////////////////////////////
            
            };
         }
      };
      
   }]);
});
