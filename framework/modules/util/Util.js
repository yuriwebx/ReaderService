/*global window: false */
define(
   ['module', 'underscore', 'ngModule', 'swLoggerFactory'],
function
   ( module,   _,            ngModule,   swLoggerFactory )
{
   'use strict';
      
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.service('swUtil', [function()
   {
      logger.trace('register');

      //////////////////////////////////////////////////////////////////////
      
      /*
       * Returns 'true' if all of the arguments are empty.
       * Returns 'false' otherwise - if at least one of the arguments is not empty.
       */
      this.isEmpty = function()
      {
         return _.every(arguments, _isEmpty);
      };
      
      function _isEmpty(value)
      {
         var empty = true;
         if ( _.isString(value) )
         {
            empty = value.trim().length === 0;
         }
         else if ( _.isArray(value) )
         {
            empty = value.length === 0;
         }
         else if ( _.isObject(value) || _.isNumber(value) || _.isDate(value) )
         {
            empty = false;
         }
         return empty;
      }
      
      //////////////////////////////////////////////////////////////////////
      
      // http://en.wikipedia.org/wiki/Universally_unique_identifier
      // http://www.broofa.com/Tools/Math.uuid.js
      // A more compact, but less performant, RFC4122v4 solution:
      this.uuid = function()
      {
         return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
         {
            /*jshint bitwise: false*/
            /*jshint eqeqeq:  false*/
            var r = Math.random() * 16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
         });
      };
      
      //////////////////////////////////////////////////////////////////////
      
      // Unfortunately, Chrome implementation of 'new Date().getTime()'
      // is of plus/minus 15ms precision. It is not acceptable.
      // Fortunately, Chrome supports 'window.performance.now()'.
      // As it is not supported by all browsers we implemented
      // polyfill that use 'new Date().getTime()' if
      // 'window.performance.now()' is not available.
      // Note that other browsers (besides Chrome)
      // implement 'new Date.getTime()' with 1ms precision
      // which is acceptable.
      
      var _p = window.performance || {};
      _p.now =
          _p.now       ||
          _p.webkitNow ||
          _p.msNow     ||
          _p.oNow      ||
          _p.mozNow    ||
          function() { return new Date().getTime(); };
          
      this.now = function()
      {
         return Math.round(_p.now() + 0.5);
      };
      
      //////////////////////////////////////////////////////////////////////
      
      /*
       * Return deep clone without properties named starting with '$' 
       */
      this.removePrivateProperties = function(data)
      {
         if ( !(data instanceof File) ) { //jshint ignore: line
            data = _.cloneDeep(data);
            _removePrivateProperties(data/*, 'root'*/);
         }
         return data;
      };
      
      function _removePrivateProperties(data/*, name*/)
      {
//         logger.trace(name, '=', data);
         
         if ( _.isArray(data) )
         {
            _.forEach(data, function(value/*, index*/)
            {
               _removePrivateProperties(value/*, name + '[' + index + ']'*/);
            });
         }
         else if ( _.isObject(data) )
         {
            _.forOwn(data, function(value, key)
            {
               if ( key.charAt(0) === '$' )
               {
                  delete data[key];
               }
               else
               {
                  _removePrivateProperties(value/*, name + '.' + key*/);
               }
            });
         }
      }
      
      //////////////////////////////////////////////////////////////////////
      
   }]);

});