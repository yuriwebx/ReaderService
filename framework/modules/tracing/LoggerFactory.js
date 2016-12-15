/*global window: false */

/**
 * This is AMD module intended for logging.
 *
 * Usage:
 *
 * var logger = swLoggerFactory.getLogger(loggerName);
 * ...
 * logger.<log-level>(arg1, arg2, arg3, ...);
 *
 * All arguments are stringified and joined into a single message.
 * Then timestamp and logger name are prepended.
 * The message is sent to browser console and to server (via MessageBuffer.js).
 * Message is sent in case if <log-level> is greater then <actual-log-level>.
 *
 * The following <log-level>s are supported:
 * - trace
 * - debug
 * - info
 * - warn
 * - error
 * - fatal
 * - all (special case for message sending regardless <actual-log-level> value)
 * - log (the same as 'all')
 *
 * In case when arguments are not simple you can use logger.is<Level>Enabled()
 * methods for minor optimization.
 *
 * <actual-log-level> is 'warn' by default and can be configured:
 *
 *  - via swLoggerFactoryConfig global var:
 *
 *       var swLoggerFactoryConfig = {
 *          <log-level>: 'regex', // case is ignored for both level and regex
 *          ...
 *          <log-level>: 'regex'
 *          // Empty <regex> means "for all loggers"
 *       };
 *
 *       For example:
 *          var swLoggerFactoryConfig = {
 *             trace: 'focus',
 *             debug: 'submachine'
 *             // 'trace' if loggerName contains 'focus'      substring
 *             // 'debug' if loggerName contains 'submachine' substring
 *          };
 *
 *  - via URL search string (overrides configuration via global var):
 *
 *       http://host:port/index.html?<log-level>=<regex>&<log-level>=<regex>&...
 *          Case is ignored for both level and regex.
 *          Empty <regex> means "for all loggers".
 *
 *       For example:
 *
 *          http://host:port/index.html?fatal=&debug=submachine
 *             - 'fatal' for all loggers
 *             - 'debug' if loggerName contains 'submachine' substring (case is ignored)
 *
 */

define( ['underscore', 'moment', 'swAppUrl', 'swMessageBuffer'],
function( _,            moment,   swAppUrl,   swMessageBuffer )
{
   'use strict';

   var levels = [];

   var Level = function(name, consoleFn, level)
   {
      this.name = name;
      this.consoleFn = consoleFn;
      this.level = level;
      levels.push(this);
   };

   Level.ALL   = new Level('ALL  ', 'log',   Number.MIN_VALUE);
   Level.TRACE = new Level('TRACE', 'debug', 10000);
   Level.DEBUG = new Level('DEBUG', 'debug', 20000);
   Level.INFO  = new Level('INFO ', 'info',  30000);
   Level.WARN  = new Level('WARN ', 'warn',  40000);
   Level.ERROR = new Level('ERROR', 'error', 50000);
   Level.FATAL = new Level('FATAL', 'error', 60000);
   Level.OFF   = new Level('OFF  ', 'dummy', Number.MAX_VALUE);

   ////////////////////////////////////////////////////////////////////////////

   // generate unique browser window/tab id
   var windowId = '';
   while ( windowId.length < 10 )
   {
      windowId += String.fromCharCode(97 + Math.round(Math.random() * 26));
   }

   ////////////////////////////////////////////////////////////////////////////

   var _customLevelsSpecified = false;

   function _processParams(params)
   {
      _.each(params, function(value, name)
      {
         name = name.toUpperCase();
         value = value || '.*'; // empty means "for all"
         _.each(levels, function(level)
         {
            if ( level.name.trim() === name )
            {
               if ( window.console && window.console.log ) { window.console.log(name, '=', value); }
               level.loggerNameRegex = new RegExp(value, 'i');
               _customLevelsSpecified = true;
            }
         });
      });
   }

   ////////////////////////////////////////////////////////////////////////////

   var _defaultLevel = Level.WARN;
   _processParams(swAppUrl.params);
   if(!_customLevelsSpecified){
      _processParams(window.swLoggerFactoryConfig);
   }

   ////////////////////////////////////////////////////////////////////////////

   var loggerFactory =
   {
      getLogger: function(loggerName)
      {
         loggerName = loggerName.replace(/[\/:]/g, '.');
         var level = _customLevelBy(loggerName) || _defaultLevel;
         return {

            log:   _logFn(Level.ALL, Level.ALL, loggerName), // regardless of actual level
            all:   _logFn(Level.ALL, Level.ALL, loggerName), // regardless of actual level

            trace: _logFn(Level.TRACE, level, loggerName),
            debug: _logFn(Level.DEBUG, level, loggerName),
            info:  _logFn(Level.INFO,  level, loggerName),
            warn:  _logFn(Level.WARN,  level, loggerName),
            error: _logFn(Level.ERROR, level, loggerName),
            fatal: _logFn(Level.FATAL, level, loggerName),

            isTraceEnabled: function() { return this.trace !== _noop; },
            isDebugEnabled: function() { return this.debug !== _noop; },
            isInfoEnabled:  function() { return this.info  !== _noop; },
            isWarnEnabled:  function() { return this.warn  !== _noop; },
            isErrorEnabled: function() { return this.error !== _noop; },
            isFatalEnabled: function() { return this.fatal !== _noop; }

         };
      }
   };

   ////////////////////////////////////////////////////////////////////////////

   function LogMessage(text, params)
   {
      swMessageBuffer.Message.call(this, 'Log', text, params);
   }

   LogMessage.prototype = new swMessageBuffer.Message();

   ////////////////////////////////////////////////////////////////////////////

   function _customLevelBy(loggerName)
   {
      return _customLevelsSpecified && _.find(levels, function(level)
      {
         var regex = level.loggerNameRegex;
         return regex && regex.test(loggerName);
      });
   }

   function _logFn(level, actLevel, loggerName)
   {
      if ( level.level < actLevel.level )
      {
         return _noop;
      }
      else
      {

         var consoleFn = _console(level);
         var levelName = level.name.trim();
         var loggerText = '[' + loggerName + '] ';
         var levelAndLoggerText = '[' + level.name + '] [' + loggerName + '] ';

         return function()
         {
            var args = _.map(arguments, function(a)
            {
               if ( _.isString   (a)   ) { return a;               }
               if ( _.isNumber   (a)   ) { return a.toString();    }
               if ( _.isRegExp   (a)   ) { return a.toString();    }
               if ( _.isUndefined(a)   ) { return 'undefined';     }
               if ( a instanceof Error ) { return _formatError(a); }
               return JSON.stringify(a);
            }).join(' ');

            swMessageBuffer.push(new LogMessage(loggerText + args, {
               level: levelName,
               windowId: windowId
            }));

            consoleFn(moment().format('HH:mm:ss,SSS') + ' ' + levelAndLoggerText + args);
         };
      }
   }

   // code duplication with PresentSystemException.js
   // idea stolen from angular $log
   function _formatError(error)
   {
      var message = error.message;
      var stack   = error.stack;

      var res = message;

      if ( stack )
      {
         var messageInStack = message && stack.indexOf(message) !== -1;
         res = messageInStack ? stack : 'Error: ' + message + '\n' + stack;
      }
      else if ( error.sourceURL )
      {
         res = message + '\n' + error.sourceURL + ':' + error.line;
      }

      return res;
   }

   // stolen from angular $log
   function _console(level)
   {
      var console = window.console || {};
      var logFn = console[level.consoleFn] || console.log || _noop;

      if ( logFn.apply )
      {
         return function()
         {
            return logFn.apply(console, arguments);
         };
      }

      // we are IE which either doesn't have window.console => this is noop and we do nothing,
      // or we are IE where console.log doesn't have apply so we log just first arg.
      return function(arg)
      {
         logFn(arg);
      };
   }

   function _noop() {}

   ////////////////////////////////////////////////////////////////////////////

   return loggerFactory;

   ////////////////////////////////////////////////////////////////////////////

});