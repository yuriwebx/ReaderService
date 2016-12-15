/**
 * Intended to create Angular services.
 * Usage:
 *
      define(['module', 'swServiceFactory'], function(module, swServiceFactory)
      {
         swServiceFactory.create({
            module: module,
            service: ['dep1', 'dep2', function(dep1, dep2)
            {
               this.method = function()
               {
                  this.logger.debug(...);
               };
            }]
         });
      });
 *
 * Angular service with name 'sw<filename>' is created.
 * Note that pre-configured 'this.logger' is ready to use.
 *
 */
define([

   'underscore',
   'angular',
   'ngModule',
   'swLoggerFactory'

   ], function(

   
   _,
   ng,
   ngModule,
   swLoggerFactory
   
   ){

   'use strict';

   function ServiceFactory()
   {
      // public (see comments in the header)
      this.create = function(options)
      {
         var serviceInject = options.service;

         // Code below assumes that service is specified as angular DI array form:
         // ['dep1', ..., 'depN', function(dep1, ..., depN){ ... }]
         if ( !ng.isArray(serviceInject) ||
              !ng.isFunction(_.last(serviceInject)) )
         {
            throw new Error('Service should be specified as [\'dep1\', ..., \'depN\', function(dep1, ..., depN){ ... }]');
         }
         
         var logger = swLoggerFactory.getLogger(options.module.id);
         logger.trace('create');

         var is = options.module.uri.lastIndexOf('/');
         var ip = options.module.uri.lastIndexOf('.');
         var name = options.module.uri.substring(is + 1, ip);

         var serviceFunction = serviceInject.pop();
         var serviceFunctionWrapped = function()
         {
            logger.trace('register');
            return serviceFunction.apply(this, arguments);
         };
         serviceInject.push(serviceFunctionWrapped);
         serviceFunctionWrapped.prototype.logger = logger;
         
         ngModule.service('sw' + name, serviceInject);
      };
   }
   
   return new ServiceFactory();
});

