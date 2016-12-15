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
      service: ['$interpolate', function($interpolate)
      {
         
         // Concrete application should override this method on config phase
         // and provide access to the source of language specific strings.
         this._getResource = function(/*key*/)
         {
            throw new Error('i18nService not configured');
         };
         
         this.getResource = function(key, context)
         {
            var result;
            if ( key )
            {
               result = this._getResource(key);
               if ( _.isUndefined(result) )
               {
                  result = key;
               }
               if ( _.isString(result) && context )
               {
                  result = $interpolate(result)(context);
               }
            }
            return result;
         };
         
         /**
            message
               id     // optional
               key    // optional, resource key ('id' used if 'key' not specified)
               text   // optional, override 'key' if specified
               params // optional, for text interpolation
          */
         this.getResourceForMessage = function(message)
         {
            return message.text || this.getResource(message.key || message.id, message.params);
         };
         
         //////////////////////////////////////////////////////////////////////
         
         // Concrete application should override this method on config phase
         this.getDateMask = function()
         {
            return 'MM/DD/YYYY';
         };
         
         // Concrete application should override this method on config phase
         this.getTimeMask = function()
         {
            return 'HH:mm';
         };
         
         // Concrete application should override this method on config phase
         this.getDttmMask = function()
         {
            return 'MM/DD/YYYY HH:mm';
         };
         
      }]
   });

});