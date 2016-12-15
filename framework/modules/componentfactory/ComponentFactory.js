/**
 * 'SWP Mobile UI Component' is an AngularJS directive based on the following
 * conventions:
 *
 *    - Directive name is composed as 'sw' prefix followed by the name of
 *      AMD module in which component is specified.
 *      For example, name of the component specified in
 *      'pl/component/uc/CreateRequisition.js' is
 *      <sw-create-requisition>.
 *
 *    - Component resources (template, css/less, images) by convention
 *      should be placed in the same directory (or sub-directory) as the
 *      component itself and referenced as AMD dependencies (see below).
 *
 *    - Directive scope (AngularJS notion) is generically augmented
 *      (see ComponentAugmenter.js). Scope augmentation is the main way
 *      to provide base/abstract/generic functionality for components.
 *
 *    - Directive scope is isolated (AngularJS notion).
 *      Parent component should provide its children with the data using
 *      isolated scope two-way binding (scopeName: '=attrName').
 *      The data should be instances of Entity type (see EntityFactory.js).
 *      When new instance of some entity is created that should replace
 *      some model instance, programmer should not replace entity reference
 *      in model but update it using Entity.update():
 *         $scope.entity = newlyCreatedEntity;        // incorrect
 *         $scope.entity.update(newlyCreatedEntity);  // correct
 *      Such an approach allows to have truly sharable models.
 *
 *
 *  The component is created as an AMD module like the following:
 *
 *       define(['swComponentFactory', 'module', 'text!./SomeComponent.html', 'css!./SomeComponent' ], function(
 *                swComponentFactory,   module,   template)
 *       {
 *          swComponentFactory.create({
 *
 *             // AMD module, it is needed to compose directive name and
 *             // to augment the scope with module id, path, and name.
 *             module: module,
 *
 *             // Note that it is AMD that loads the template and places its
 *             // content here as 'string'
 *             template: template,
 *
 *             // Client programmer should specify whether this component will
 *             // have the instance of Submachine (see Submachine.js).
 *             // If 'true' then Submachine instance will be available
 *             // in controller as $scope.swSubmachine
 *             // If the component deals with subject domain then it normally
 *             // should have Submachine.
 *             // If the component is some sort of generic/base UI component
 *             // then it normally should not have Submachine.
 *             submachine: true, // 'false' by default
 *
 *             // Please see AngularJS directive isolated scope notion
 *             // and comments above
 *             isolatedScope:
 *             {
 *                // ...
 *             },
 *
 *             // Please see AngularJS directive controller notion
 *             // and comments above
 *             controller: ['$scope', 'dep1', ..., 'depN', function($scope, dep1, ..., depN)
 *             {
 *                $scope.swInit = function()
 *                {
 *                   // Generic life-cycle method.
 *                   // Invoked when component is created.
 *                };
 *
 *                $scope.swDestroy = function()
 *                {
 *                   // Generic life-cycle method.
 *                   // Invoked when component is destroyed.
 *                };
 *
 *                // ...
 *             }
 *          ]});
 *       });
 *
 */
define([

   'module',
   'underscore',
   'angular',
   'ngModule',
   'swLoggerFactory'

   ], function(

   
   module,
   _,
   ng,
   ngModule,
   swLoggerFactory
   
   ){

   'use strict';

   function ComponentFactory()
   {
      // public (see comments in the header)
      this.create = function(options)
      {
         var componentModule = options.module;
         var template        = options.template || '';
         var isolatedScope   = options.isolatedScope || {};
         var submachine      = options.submachine;
         var controller      = options.controller;
         var restrict        = options.restrict || 'E';
         
         var logger = swLoggerFactory.getLogger(module.id);
         logger.trace('create', componentModule.id);
         logger = swLoggerFactory.getLogger(componentModule.id);
         
         // Code below assumes that controller is specified as angular DI array form:
         // ['dep1', ..., 'depN', function(dep1, ..., depN){ ... }]
         if ( !ng.isArray(controller) ||
              !ng.isFunction(_.last(controller)) )
         {
            throw new Error('Controller should be specified as [\'dep1\', ..., \'depN\', function(dep1, ..., depN){ ... }]');
         }

         // The scope is created later when angular processes the DOM and
         // encounters the directive instance. Then it creates the scope
         // and invokes the controller to augment this scope. We would like
         // to add our own generic augmentation there. So we replace the original
         // controller with adapted one which does augmentation and then invokes
         // original controller. Augmentation is performed by 'swComponentAugmenter'
         // service (see ComponentAugmenter.js) which we manually added to DI list
         // to access it in adapted controller. To access the scope to be augmented
         // we use the same technique.
         
         var _this = this;
         
         var _augmenter;
         var _augmenterOptions;
         
         function _adaptedController()
         {
            var augmenter = arguments[arguments.length - 3];
            var scope     = arguments[arguments.length - 2];
            var element   = arguments[arguments.length - 1];
            
            _augmenter = augmenter;
            _augmenterOptions = {
               componentModule : componentModule,
               componentScope : scope,
               componentElement : element,
               submachine: submachine
            };
            
            _augmenter.onCreate(_augmenterOptions);
            
            logger.trace('controller starting', scope.$id);
            origController.apply(_this, arguments);
            logger.trace('controller ended', scope.$id);
         }
         
         var origController = controller.pop();
         controller.push('swComponentAugmenter');
         controller.push('$scope');
         controller.push('$element');
         controller.push(_adaptedController);
         
         var cm = componentModule;
         var is = cm.uri.lastIndexOf('/');
         var ip = cm.uri.lastIndexOf('.');
         var componentName = cm.uri.substring(is + 1, ip);
         
         ngModule.directive('sw' + componentName, [function()
         {
            logger.trace('register');
            
            return {
               restrict: restrict,
               replace: true,
               template: template,
               transclude: template.indexOf('ng-transclude'),
               scope: isolatedScope,
               controller: controller,

               compile: function compile(/*element, attrs, transclude*/)
               {
                  logger.trace('compile');
                  
                  return {
                     pre:  function  prelink(scope /*, element, attrs, controller*/)
                     {
                        logger.trace('prelink', scope.$id);
                     },
                     post: function postlink(scope /*, element, attrs, controller*/)
                     {
                        logger.trace('postlink', scope.$id);
                        
                        _augmenter.onInit(_augmenterOptions);
                        
                        if ( scope.swSubmachine )
                        {
                           scope.swSubmachine._init(); // scope.swInit() invoked inside
                           // scope.swInit() is included to swSubmachine._init()
                           // to encapsulate all necessary initialization actions in one place.
                           // In particular, it is needed to have a possibility to
                           // re-initialize component that is already created.
                        }
                        else
                        {
                           if ( ng.isFunction(scope.swInit) )
                           {
                              scope.swInit();
                           }
                        }
                        
                        var destroyed = false;
                        scope.$on('$destroy', function()
                        {
                           if ( !destroyed )
                           {
                              logger.trace('destroy', scope.$id);
                              destroyed = true;
                              
                              _augmenter.onDestroy(_augmenterOptions);
                              
                              if ( ng.isFunction(scope.swDestroy) )
                              {
                                 scope.swDestroy();
                              }
                              
                              if ( scope.swSubmachine )
                              {
                                 scope.swSubmachine._destroy();
                              }
                           }
                        });
                        
                     }
                  };
               } // compile
            }; // return
         }]); // ngModel.directive
      };
   }
   
   return new ComponentFactory();
});

