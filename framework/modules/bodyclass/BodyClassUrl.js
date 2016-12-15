/**

   Usage:
      http://host/path&bodyclass=class1&bodyclass=class2
      
   Add specified class(es) to BODY when application starts up.

*/

define([

   'module',
   'underscore',
   'jquery',
   'swAppUrl',
   'swLoggerFactory'
   
   ], function(

   module,
   _,
   $,
   swAppUrl,
   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   var cls = swAppUrl.params.bodyclass;
   cls = _.isArray(cls) ? cls.join(' ') : cls;
   
   logger.trace(cls);

   $('body').addClass(cls);

});
