/**
 * Service for easy-way working with localStorage. You don't need use 
 * JSON.parse/JSON.stringify for you encode/decode data.
 * 
 * Also, if you have another strategy for localStorage key naming, you can reconfigure this rule.
 * You need call '_configure' method with key-naming strategy
 */
define([
        
   'module',
   'underscore',
   'swServiceFactory'
   
   ], function(
         
   module,
   _,
   swServiceFactory

   ){
      'use strict';

      swServiceFactory.create({
         module: module,
         service: ['$window', function($window)
         {
            /* --- api --- */
            this.get    = getStorage;
            this.set    = setStorage;
            this.remove = removeStorage;

            /* === impl === */
            this._configure = _configure;

            var logger        = this.logger,
                localStorage  = $window.localStorage,
                _keyMapper    = _.identity;

            function _configure(finder)
            {
               _keyMapper = finder;
            }

            function getStorage(key)
            {
               var storageKey = _keyMapper(key);
               var storage = localStorage.getItem(storageKey);
               logger.trace('get', storageKey, storage);
               try
               {
                  return JSON.parse(storage);
               } catch ( e )
               {
                  logger.error(e.message, storageKey, storage);
                  return null;
               }
            }

            function setStorage(key, storage)
            {
               storage = JSON.stringify(_prepareValue(storage));
               var storageKey = _keyMapper(key);
               localStorage.setItem(storageKey, storage);
               logger.trace('set', storageKey, storage);
            }

            function removeStorage(key)
            {
               var storageKey = _keyMapper(key);
               localStorage.removeItem(storageKey);
            }

            function _prepareValue(value)
            {
               // JSON.stringify|parse work inconsistently with 'undefined'
               return _.isUndefined(value) ? null : value;
            }

         }]
      });
   });
