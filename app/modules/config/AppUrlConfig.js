define(['underscore'], function(_)
{
   'use strict';
   
   return {
      
      parse: function(source, parse)
      {
         var url = parse(source);

         var hash = url.fragment;
         var params = _.object(_.map(hash.split('&'), function(el) { return el.split('='); }));
         if ( _.has(params, 'access_token') || _.has(params, 'oauth_token') )
         {
            source = url.withoutFragment; // ignore deeplink // TODO: extract and keep deeplink
            url = parse(source);
            url.oauth = params;
         }
         else if ( _.has(params, 'taskConfirmationHashCode') && _.has(params, 'confirm'))
         {
            source = url.withoutFragment;
            url = parse(source);
            url.confirmationInfo = params;
         }
         return url;
      }
   
   };
   
});
