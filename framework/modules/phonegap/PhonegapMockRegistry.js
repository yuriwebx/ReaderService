define([
   'module',
   'underscore',
   'swLoggerFactory'
],
function(
   module,
   _,
   swLoggerFactory
){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   var registry = [];

   return {

      register: function(pluginInvocation)
      {
         registry.push(pluginInvocation);
      },
   
      getMock: function(pluginInvocation)
      {
         var p = _.find(registry, function(pi)
         {
            return pluginInvocation.plugin === pi.plugin &&
                   pluginInvocation.method === pi.method;
         });
         return p && p.mock;
      }
   
   };
});
