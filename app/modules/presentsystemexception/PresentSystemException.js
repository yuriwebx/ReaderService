/*global window: false */
   
define( [
         
   'underscore',
   'jquery',
   'module',
   'ngModule',
   'swExceptionHandler',
   'swLoggerFactory',
   'text!./PresentSystemExceptionError.html',
   'text!./PresentSystemExceptionMessage.html',
   'less!./PresentSystemException'
   
],
function(
      
   _,
   $,
   module,
   ngModule,
   swExceptionHandler,
   swLoggerFactory,
   templateError,
   templateMessage
   
)
{
   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ////////////////////////////////////////////////////////////////////////////
   
   // We intentionally implement exception handler as simple as possible.
   // Assumed that when exception occurs application is in unstable state
   // and we cannot rely on any complex (our or 3rd party) infrastructures
   // and perform not trivial DOM manipulation. So we just log exception
   // and simply _append_ message to DOM. Specific CSS-styling is used so
   // that our message appears over current screen content.
   
   ////////////////////////////////////////////////////////////////////////////
   
   var _i18nService; // will be set as soon as angular is bootstrapped
   var _location;    // will be set as soon as angular is bootstrapped
   ngModule.run(['swI18nService', 'swLocation',
      function(   swI18nService,   swLocation )
   {
      _i18nService = swI18nService;
      _location    = swLocation;
   }]);
   
   // 'Bootstrap' resources (used until angular is bootstrapped).
   var _resources = {
      'PresentSystemException.error.text':
         'System error has occurred.',
      'PresentSystemException.error.instruction.text':
         'Please press "Continue" to restore your work with the system.<br>' +
         'If problems persist, please contact your System Administrator.',
      'PresentSystemException.message.instruction.text':
         'Please re-login to continue your work with the system.',
      'PresentSystemException.continue.button.label':
         'Continue'
   };
   
   function _getResource(key)
   {
      try
      {
         var res = _i18nService.getResource(key);
         if ( !res || res === key )
         {
            throw new Error(key);
         }
         return res;
      }
      catch ( e )
      {
         return _resources && _resources[key] || key;
      }
   }

   ////////////////////////////////////////////////////////////////////////////
   
   function _localizeMessages(messages)
   {
      return _.map(messages, function(m)
      {
         try
         {
            return _i18nService.getResourceForMessage(m);
         }
         catch ( e )
         {
            return m.text || m.key || m.id;
         }
      });
   }
   
   ////////////////////////////////////////////////////////////////////////////
   
   function _processError(error)
   {
      _process({
         template:   templateError,
         instrText:  _getResource('PresentSystemException.error.instruction.text'),
         errorText:  _getResource('PresentSystemException.error.text'),
         stackTrace: _formatError(error)
      });
   }
                                          
   function _processMessages(messages)
   {
      _process({
         template:   templateMessage,
         instrText:  _getResource('PresentSystemException.message.instruction.text'),
         errorText:  _localizeMessages(messages).join('<br>'),
         stackTrace: ''
      });
   }
   
   function _process(options)
   {
      var templateInterpolated = options.template
         .replace('<instruction-placeholder/>',         options.instrText)
         .replace('<errorText-placeholder/>',           options.errorText)
         .replace('<errorStackTrace-placeholder/>',     options.stackTrace)
         .replace('<continueButtonLabel-placeholder/>',
            _getResource('PresentSystemException.continue.button.label'));
      
      // delete previous exception presentation
      // just in case to be ready for many subsequent exceptions
      $('.sw-presentSystemException').remove();
      
      $(templateInterpolated).appendTo($('body')).find('button').click(function()
      {
         if ( _location )
         {
            _location.reload();
         }
         else
         {
            window.location.reload(true);
         }
      });
   }
                                          
   ////////////////////////////////////////////////////////////////////////////
   
   // code duplication with LoggerFactory.js
   // idea stolen from angular $log
   function _formatError(error)
   {
      var message = _escape(error.message);
      var stack   = _escape(error.stack);
      
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
   
   function _escape(s)
   {
      // http://stackoverflow.com/questions/24816/escaping-html-strings-with-jquery
      // we need it because FF inserts '<' into error stack
      return s && $('<div/>').text(s).html();
   }
   
   ////////////////////////////////////////////////////////////////////////////
   
   swExceptionHandler.addListener(function(options)
   {
      if ( options.error )
      {
         _processError(options.error);
      }
      else if ( options.messages )
      {
         _processMessages(options.messages);
      }
      else
      {
         logger.error('"error" or "messages" attribute expected in', options);
      }
   });
         
   ////////////////////////////////////////////////////////////////////////////
         
});