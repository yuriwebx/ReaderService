define([
   'module',
   'underscore',
   'swLoggerFactory'
],
function(
   module,
   _,
   swLoggerFactory
){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   var registry = [];

   function _endsWith(s, t)
   {
      return s.lastIndexOf(t) === s.length - t.length;
   }
         
   return {

      register: function(r)
      {
         registry.push(r);
      },
   
      getMock: function(req)
      {
         var url = /[^\;\?]*/.exec(req.url)[0]; // cut jsessionid and parameters
         var maxlen = 0; // find mock with the most specific (the longest) url 
         var res;
         _.each(registry, function(r)
         {
            if ( req.method === r.method && _endsWith(url, r.url) && r.url.length > maxlen )
            {
               res = r;
               maxlen = r.url.length;
            }
         });
         return res && res.mock;
      }
   
   };
});
