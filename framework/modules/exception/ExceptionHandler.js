/*global window: false */
   
define( [
         
   'underscore',
   'module',
   'swLoggerFactory'
   
],
function(
      
   _,
   module,
   swLoggerFactory
   
)
{
   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   // Important.
   // This module should be 'require'd as early as possible to provide
   // errors catching while bootstrap process is in progress.
   
   // We intentionally implement exception handler as simple as possible.
   // Assumed that when exception occurs application is in unstable state
   // and we cannot rely on any complex (our or 3rd party) infrastructures
   // and perform not trivial DOM manipulation.
   
   // propagate all uncaught errors to our handler
   window.onerror = function(msg, url, line)
   {
      _processError(new Error(msg + '\n' + url + ':' + line));
   };
   
   // keep angular $exceptionHandler API
   function _exceptionHandler(error, cause)
   {
      _processError(error, cause);
   }
   
   function _processError(error, cause)
   {
      logger.fatal(error, cause || '');
      _processListeners({ error: error });
   }
                                          
   function _processMessages(messages)
   {
      _processListeners({ messages: messages });
   }
   
   var _listeners = [];
   
   function _processListeners(options)
   {
      _.each(_listeners, function(listener)
      {
         try
         {
            listener(options);
         }
         catch (e)
         {
            logger.error('exception in listener:', e);
         }
      });
   }
   
   function ExceptionHandler()
   {
      this.getExceptionHandler = function()
      {
         return _exceptionHandler; // compatible with angular $exceptionHandler
      };
      
      this.showMessages = function(messages)
      {
         _processMessages(messages);
      };
      
      this.addListener = function(listener)
      {
         _listeners.push(listener);
      };
      
      this.removeListener = function(listener)
      {
         _listeners = _.without(_listeners, listener);
      };
   }
   
   return new ExceptionHandler();
   
});