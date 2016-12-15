define([

   'module',
   'underscore',
   'swServiceFactory',
   'text!./MessageBox.html',
   'less!./MessageBox',

   ], function(

   module,
   _,
   swServiceFactory,
   content

   ){

   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$interpolate', 'swPopup', 'swI18nService', function($interpolate, swPopup, swI18nService)
      {
         // see comments in Popup.js
         this.show = function(opts)
         {
            var options = _.clone(opts);
            options.layout = options.layout || {};
            options.modal = true;
            if (options.customClass)
            {
               options.customClass = 'sw-messageBox' + ' ' + options.customClass;
            }
            else
            {
               options.customClass = 'sw-messageBox';
            }

            var errors   = _asArray(options.error  );
            var warnings = _asArray(options.warning);
            var others   = _asArray(options.content);
            
            _.each(options.messages, function(message)
            {
               var text = swI18nService.getResourceForMessage(message);
               
               if ( message.separator )
               {
                  text = '\n' + text;
               }
               switch ( message.severity )
               {
                  case 'ERROR'  : errors  .push(text); break;
                  case 'WARNING': warnings.push(text); break;
                  default       : others  .push(text); break;
               }
            });
            
            var allMessages = [];
            var error   = _processMessages(errors,   allMessages);
            var warning = _processMessages(warnings, allMessages);
            var other   = _processMessages(others,   allMessages);
            
            if ( allMessages.length === 0 )
            {
               this.logger.trace('no messages -> resolve immediately');
               return swPopup.emulateHidden();
            }
            
            var type = options.type ||
                           (error   && 'error'  ) ||
                           (warning && 'warning') ||
                           (other   && 'confirmation');
            
            options.content = _interpolate({
               type: type,
               messages: allMessages.join('<p>')
            });
            
            return swPopup.show(options);
         };

         var _interpolate = $interpolate(content);
         
         function _asArray(a)
         {
            return _.isArray(a) ? a : [ a ? '' + a : '' ];
         }
         
         function _processMessages(messages, allMessages)
         {
            var updated = false;
            _.each(messages, function(message)
            {
               message = message && message.replace(/(\n|\\n)/g, '<br>').trim();
               if ( message )
               {
                  updated = true;
                  allMessages.push(message);
               }
            });
            return updated;
         }
      }]
   });

});
