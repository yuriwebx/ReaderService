/* jshint node: true */
(function () {
   'use strict';

   var fs = require('fs');
   var methods = 'trace|debug|info|warn|error|fatal'.split('|');
   var log4js = require('log4js');
   var config = require(__dirname + '/configReader.js');
   var nodemailer = require('nodemailer');
   var smtpTransport = require('nodemailer-smtp-transport');
   var transporter = nodemailer.createTransport(smtpTransport(config.smtpConfig));


   if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
   }
   var loggerConfig = {
         appenders : [{
            filename : 'logs/agent.trace',
            type : "dateFile",
            "pattern" : ".yyyy-MM-dd.log",
            "alwaysIncludePattern" : false,
            category : 'agent'
         },
         {
            filename : 'logs/server.trace',
            type : "dateFile",
            "pattern" : ".yyyy-MM-dd.log",
            "alwaysIncludePattern" : false,
            category : 'server'
         },
         {
            filename : 'logs/client.trace',
            type : "dateFile",
            "pattern" : ".yyyy-MM-dd.log",
            "alwaysIncludePattern" : false,
            category : 'client'
         },
         {
            filename : 'logs/access.trace',
            type : "dateFile",
            "pattern" : ".yyyy-MM-dd.log",
            "alwaysIncludePattern" : false,
            category : 'accesslog'
         },
         {
            filename : 'logs/error.trace',
            type : "dateFile",
            "pattern" : ".yyyy-MM-dd.log",
            "alwaysIncludePattern" : false,
            category : 'errors'
         },
         {
            filename : 'logs/dbvalidation.trace',
            type : "dateFile",
            "pattern" : ".yyyy-MM-dd.log",
            "alwaysIncludePattern" : false,
            category : 'validation'
         }
      ]
   };
// Use -v key at command line to have verbose output
   /* global process:false */
   if (process && process.argv) {
      for (var i = 2; i < process.argv.length; i++) {
         if ('-v' === process.argv[i].trim()) {
            loggerConfig.appenders.push({type : 'console'});
         }
      }
   }
   log4js.configure(loggerConfig);
   var loggerLayer = function (level, message) {
      var layer = {
         ALL : loggers.client.info,
         LOG : loggers.client.info,
         TRACE : loggers.client.trace,
         DEBUG : loggers.client.debug,
         INFO : loggers.client.info,
         WARN : loggers.client.warn,
         ERROR : loggers.client.error,
         FATAL : loggers.client.fatal
      };
      layer[level].apply(loggers.client, [message]);
   };

   var ip = '';
   var
      loggers = {}, loggersNames = ['errors', 'server', 'accesslog', 'client', 'validation'];
   loggersNames.forEach(function (name) {
      loggers[name] = log4js.getLogger(name);
   });
   loggers.validation.log = loggers.validation.info;
   loggers.connectLogger = log4js.connectLogger(loggers.accesslog, {level : 'auto'});

   var validationErrorHandler = loggers.validation.error;
   loggers.validation.error = function(error, dontSendEmail){
      var currUrl = config.serverURL||'unknown';
      var currEnv = config.environment_name||'unknown' + '/' + config.database_name||'unknown';
      var message = [
         'Current URL: ' + currUrl,
         'Current folder: ' + __dirname,
         'The error is: ' + error
      ];
      if(!dontSendEmail){
         transporter.sendMail({
            from : config.validationNotificationsSettings.from,
            to : config.validationNotificationsSettings.to,
            subject : config.validationNotificationsSettings.subject + '(' + currEnv + ')',
            html : message.join('\n\n').replace(/\n/mg, '\n<br/>')
         });
      }
      validationErrorHandler.apply(loggers.validation, [error]);
   };
   module.exports = {
      getLogger : function (module, loggerName) {
         module = module.split(/[\/\\]/).pop();
         var res = {};
         var fn = function (method) {
            return function (line, isWrapper) {
               var fileLine = '';
               if (method !== 'info') {
                  var lineNo = 2;
                  if (isWrapper) {
                     lineNo++;
                  }
                  var stack = new Error().stack.split('\n'), match;
                  if (stack && stack[lineNo]) {
                     match = stack[lineNo].match(/((?:[\\\/][^\\\/]+){2})(\:\d+)\:\d+\)?$/);
                     if (match) {
                        module = match[1];
                        fileLine = match[2];
                     }
                  }
               }
               if (undefined === line || null === line) {
                  line = 'undefined';
               }
               else {
                  if (typeof line === 'object') {
                     line = JSON.stringify(line);
                  }
               }
               line = line.toString().replace(/\\n/g, '\n');
               var message = '(' + (ip || '127.0.0.1') + ') [' + module + fileLine + '] ' + line;

               var serverLogger = loggerName || 'server';
               var errorsLogger = loggerName || 'errors';
               if (loggerName) {
                  loggers[loggerName] = loggers[loggerName] || log4js.getLogger(loggerName);
               }
               loggers[serverLogger][method]
                  .apply(loggers[serverLogger], [message]);
               if (method === 'error' || method === 'fatal') {
                  loggers[errorsLogger][method].apply(loggers[errorsLogger], [message]);
               }
            };
         };
         for (var i = 0; i < methods.length; i++) {
            res[methods[i]] = fn(methods[i]);
         }
         res.log = res.info;
         return res;
      },
      setIP : function (ipAddr) {
         ip = ipAddr;
      },
      loggerLayer : loggerLayer,
      connectLogger : loggers.connectLogger,
      validationLogger : loggers.validation
   };
})();