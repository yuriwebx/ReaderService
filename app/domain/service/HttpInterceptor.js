define([

   'module',
   'underscore',
   'jquery',
   'angular',
   'ngModule',
   'swLoggerFactory',
   'swExceptionHandler'

], function(

   module,
   _,
   $,
   ng,
   ngModule,
   swLoggerFactory,
   swExceptionHandler

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.run(['swHttp', 'swHttpInterceptor', function(swHttp, swHttpInterceptor)
   {
      logger.trace('run');
      swHttp.setInterceptor(swHttpInterceptor);
   }]);

   ngModule.service('swHttpInterceptor', [

      '$q',
      //'swUserSessionService',
      'swLongRunningOperation',
      'swPopupService',
      'swOfflineModeService',
      'swApplicationToolbarService',

      function(

         $q,
         //swUserSessionService,
         swLongRunningOperation,
         swPopupService,
         swOfflineModeService,
         swApplicationToolbarService

         )
      {
         logger.trace('register');

         var successfulRequestsCounter = 0;
         var failedRequestsCounter = 0;
         var lastFailedCodesAmount = 5;
         var lastFailedCodes = [];

         this.beforeRequest = function(config)
         {
            logger.trace('beforeRequest', config.method, config.url);

            config.swLongRunningOperationEnd = _.noop;
            if ( config.swBlockUserInput !== false )
            {
               config.swLongRunningOperationEnd = swLongRunningOperation.start(config.method + ' ' + config.url);
            }

            return $q.when();
         };

         this.beforeResponseSuccess = function(response, updateResult)
         {
            logger.trace('beforeResponseSuccess', response.config.method, response.config.url);
            swOfflineModeService.setOnline();

            response.config.swLongRunningOperationEnd();
            response.config.swLongRunningOperationEnd = null;

            successfulRequestsCounter++;

            var status = response.data.statusMessages;
            var showWarningsImmediately = false;

            if ( status && status !== 'OK' )
            {
               if ( !_.isArray(status) )
               {
                  throw new Error('status: "OK" or [] expected');
               }

               // Map 'status' to 'messages'
               // 'messages' is used in 'Mobile'     app
               // 'status'   is used in 'Phlebotomy' app

               // This is temporary solution to support 'Phlebotomy' app.
               // TODO Migrate Mobile to the same scheme as Phlebotomy.

               // Note that, in 'Mobile', app warnings are not shown on generic level
               // (it's assumed that client code is responsible for warnings processing).
               // In 'Phlebotomy', we'd like to process warnings on generic level.
               // So we introduce 'showImmediately' flag.

               showWarningsImmediately = true;

               // TODO
               // Show warnings on generic level always and introduce special flag
               // on http.config for cases when we really want to process warnings
               // in client code.

               response.data.messages = response.data.messages || [];
               _.each(status, function(s)
               {
                  response.data.messages.push({
                     severity: s.severity,
                     text: s.text && s.text.replace(/</g, '&lt;')
                  });
               });
            }

            if ( _.any(response.data.messages, {severity: 'FATAL'}) )
            {
               return _processFatalMessages(response);
            }

            if ( _.any(response.data.messages, {severity: 'ERROR'}) )
            {
               return _processErrorMessages(response);
            }

            updateResult();

            if ( showWarningsImmediately &&
               _.any(response.data.messages, {severity: 'WARNING'}) )
            {
               return _processWarningMessages(response);
            }

            return $q.when();
         };

         this.beforeResponseError = function(response)
         {
            // It's assumed here that server catches all exceptions uncaught in business code
            // and maps them to 'response.data.messages' -> so they are shown by 'beforeResponseSuccess'.
            // Then we may treat all responses fallen here as 'connection/communication errors'.

            swOfflineModeService.setOffline(response);

            var updResult = swOfflineModeService.processRestRequest(response.config);
            if(updResult){
               response.config.swLongRunningOperationEnd();
               response.config.swLongRunningOperationEnd = null;
               return $q.when(updResult);
            }
            failedRequestsCounter++;
            lastFailedCodes.push(response.status);
            lastFailedCodes = _.takeRight(lastFailedCodes, lastFailedCodesAmount);

            logger.error('beforeResponseError', {
               method: response.config.method,
               url:    response.config.url,
               status: response.status,
               data:   response.data
            });

            response.config.swLongRunningOperationEnd();
            response.config.swLongRunningOperationEnd = null;


            if(swApplicationToolbarService.isEditor()) {
                return swPopupService.showMessageBox({
                messages: [{ severity: 'ERROR', key: 'Problem with Internet connection', params: {
                errorCode: response.status,
                errorText: response.statusText,
                failedRequestsCounter: failedRequestsCounter,
                successfulRequestsCounter: successfulRequestsCounter,
                lastFailedCodesAmount: lastFailedCodesAmount,
                lastFailedCodes: lastFailedCodes.join(', ')
                } }],
                close: ng.noop
                }).promise.then(function() {
                   return $q.defer().reject();
                });
            }
            else {
               return $q.when();
            }

         };

         function _processFatalMessages(response)
         {
            logger.fatal(response.config.method, response.config.url, response.data.messages);
            swExceptionHandler.showMessages(response.data.messages);
            return $q.defer().promise; // never be resolved -> invoker hangs by intention
         }

         function _processErrorMessages(response)
         {
            logger.error(response.config.method, response.config.url, response.data.messages);
            return swPopupService.showMessageBox({
               messages: response.data.messages,
               close:    ng.noop
            }).promise.then(function()
               {
                  return $q.reject();
               });
         }

         function _processWarningMessages(response)
         {
            logger.warn(response.config.method, response.config.url, response.data.messages);
            return swPopupService.showMessageBox({
               messages: response.data.messages,
               close:    ng.noop
            }).promise;
         }

         /////////////////////////////////////////////////////////////////////////

         this.beforeCall = function(/*settings*/)
         {
         };

         this.beforeCallSuccess = function(response)
         {
            swOfflineModeService.setOnline();
            response.swFatal = _.findWhere(response.data.messages, {severity: 'FATAL'});
            response.swError = _.findWhere(response.data.messages, {severity: 'ERROR'});
            response.swMessages = response.data.messages;

            if ( response.swFatal || response.swError )
            {
               // jQuery promise is used as angular promise always requests digest
               // which we want to avoid here: we need really "silent" mode.
               var d = $.Deferred();
               d.reject(response);
               return d.promise();
            }

            return response;
         };

         this.beforeCallError = function(response)
         {
            swOfflineModeService.setOffline(response);
            var updResult = swOfflineModeService.processRestRequest(response.config);
            if(updResult){
               response.config.swLongRunningOperationEnd();
               response.config.swLongRunningOperationEnd = null;
            }
            return response;
         };

         /////////////////////////////////////////////////////////////////////////

         //var JSESSIONID = ';jsessionid=';

         this.rewriteUrl = function(url)
         {
            /*var swUserSession = swUserSessionService.getUserSession();
            if ( swUserSession.id && url.indexOf(JSESSIONID) === -1 )
            {
               url += JSESSIONID + swUserSession.id;
            }*/

            return url;
         };

         /////////////////////////////////////////////////////////////////////////

      }]);
});