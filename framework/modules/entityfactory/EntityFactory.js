/**
 * Intended to create subject domain entities (see Entity.js).
 *
 * In client code, entities should not be created directly via 'new' operator.
 * This factory should be used instead.
 *
 * Example:
 *    $scope.user = swEntityFactory.create('User', { name: 'ANONYM' })
 *
 */
define([

   'module',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   ngModule,
   swLoggerFactory

   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ////////////////////////////////////////////////////////////////////////////
   
   var _$injector;
   
   ////////////////////////////////////////////////////////////////////////////
   
   function EntityFactory()
   {
      logger.trace('register');

      this.register = function(type, constructorFactory)
      {
         logger.trace('register', type);
         ngModule.factory(type, constructorFactory);
      };

      this.create = function(type)
      {
         logger.trace('create', type);
         var constructor = _$injector.get(type);
         var args = Array.prototype.slice.call(arguments, 1); // skip first argument
         var _this = Object.create(constructor.prototype);
         constructor.apply(_this, args);
         return _this;
      };
   }

   ////////////////////////////////////////////////////////////////////////////
   
   var swEntityFactory = new EntityFactory();
   
   ////////////////////////////////////////////////////////////////////////////
   
   ngModule.factory('swEntityFactory', ['$injector', function($injector)
   {
      _$injector = $injector;
      return swEntityFactory;
   }]);
   
   ////////////////////////////////////////////////////////////////////////////
   
   return swEntityFactory;
   
   ////////////////////////////////////////////////////////////////////////////
   
});