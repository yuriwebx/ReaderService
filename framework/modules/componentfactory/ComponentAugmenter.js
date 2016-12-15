/**
 * Performs generic scope augmentation of component (see ComponentFactory.js).
 *
 * The following properties are set:
 *
 *  $scope.logger
 *
 *  $scope.module.id   - id of AMD module in which component is specified
 *  $scope.module.path - path part of module id
 *  $scope.module.name - name part of module id
 *
 *  $scope.swSubmachine (see Submachine.js)
 *
 *  $scope.swUtil (see Util.js)
 *
 *  $scope.swForm        - function that returns the nearest (from this component and up the tree) form
 *  $scope.swFormIsDirty - function that returns the nearest (from this component and up the tree) form dirty state
 *  
 *  $scope.swFocus    (selector) - find element by selector in this component and focus it
 *  $scope.swFocusBody(selector) - find element by selector in body and focus it
 *  
 *  $scope.swLayout = function(context) { ... }
 *     If this function is specified on component scope then it is automatically registered
 *     on swLayoutManager (see LayoutManager.js).
 *     It is also invoked automatically right after "swInit" invocation.
 *     In the latter case the layout context contains only "initiating" event.
 *
 */
define([

   'module',
   'underscore',
   'jquery',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   _,
   $,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.service('swComponentAugmenter', [
                                             
      '$timeout',
      'swSubmachine',
      'swUtil',
      'swLayoutManager',
      
   function(
         
      $timeout,
      swSubmachine,
      swUtil,
      swLayoutManager
      
   )
   {
      logger.trace('register');
      
      this.onCreate = function(options)
      {
         logger.trace('onCreate starting', options.componentModule.id, options.componentScope.$id);

         _processModule(options);
         _processLogger(options);
         _processSubmachine(options);
         _processUtil(options);
         _processFocus(options);
         
         logger.trace('onCreate ended', options.componentModule.id, options.componentScope.$id);
      };

      this.onInit = function(options)
      {
         logger.trace('onInit starting', options.componentModule.id, options.componentScope.$id);

         _processForm(options);
         _processLayoutManagerInit(options);
         
         logger.trace('onInit ended', options.componentModule.id, options.componentScope.$id);
      };

      this.onDestroy = function(options)
      {
         logger.trace('onDestroy starting', options.componentModule.id, options.componentScope.$id);

         _processLayoutManagerDestroy(options);
         
         logger.trace('onDestroy ended', options.componentModule.id, options.componentScope.$id);
      };

      function _processModule(options)
      {
         var m = options.componentModule;
         var is = m.uri.lastIndexOf('/');
         var ip = m.uri.lastIndexOf('.');
         options.componentScope.module =
         {
            id:   m.id,
            path: m.uri.substring(0, is),
            name: m.uri.substring(is + 1, ip)
         };
      }
      
      function _processLogger(options)
      {
         var loggerName = options.componentModule.id + ':' + options.componentScope.$id;
         options.componentScope.logger = swLoggerFactory.getLogger(loggerName);
      }
      
      function _processSubmachine(options)
      {
         if ( options.submachine )
         {
            swSubmachine.createInstance(options.componentScope);
         }
      }

      function _processUtil(options)
      {
         options.componentScope.swUtil = swUtil;
      }
      
      function _processFocus(options)
      {
         options.componentScope.swFocus = function(selectorToFocus)
         {
            $timeout(function()
            {
               options.componentElement.find(selectorToFocus).focus();
            }, 0, false);
         };
         
         options.componentScope.swFocusBody = function(selectorToFocus)
         {
            $timeout(function()
            {
               $('body').find(selectorToFocus).focus();
            }, 0, false);
         };
      }
      
      function _processForm(options)
      {
         options.componentScope.swForm = function()
         {
            return options.componentElement.controller('form');
         };
         
         options.componentScope.swFormIsDirty = function()
         {
            var form = options.componentElement.controller('form');
            return form && form.$dirty;
         };
         
         if ( options.componentElement.attr('ng-form') )
         {
            var form = options.componentElement.controller('form');
            form.$swElement = function()
            {
               return options.componentElement;
            };
         }
      }
      
      function _processLayoutManagerInit(options)
      {
         var scope = options.componentScope;
         if ( !_.isFunction(scope.swLayout) )
         {
            return;
         }
         
         // wrap swLayout to ensure it is always invoked with swLayoutManager context
         scope.$swLayout = scope.swLayout;
         scope. swLayout = function()
         {
            if ( arguments.length === 0 )
            {
               return scope.$swLayout.apply(scope, [swLayoutManager.context()]);
            }
            else
            {
               return scope.$swLayout.apply(scope, arguments);
            }
         };
         
         // wrap swInit to always invoke swLayout after it
         scope.$swInit = scope.swInit;
         scope. swInit = function()
         {
            if ( _.isFunction(scope.$swInit) )
            {
               scope.$swInit();
            }
            if ( _.isFunction(scope.swLayout) )
            {
               scope.swLayout();
            }
         };
         
         // register original (not wrapped) swLayout since
         // swLayoutManager invokes it with arguments
         swLayoutManager.register({ layout: scope.$swLayout, id: _layouterId(options) });
      }
      
      function _processLayoutManagerDestroy(options)
      {
         var scope = options.componentScope;
         if ( _.isFunction(scope.swLayout) )
         {
            swLayoutManager.unregister(_layouterId(options));
         }
      }
      
      function _layouterId(options)
      {
         return options.componentModule.id + ':' + options.componentScope.$id;
      }
      
   }]);

});
