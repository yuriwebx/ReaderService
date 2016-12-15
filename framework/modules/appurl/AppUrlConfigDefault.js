define([], function()
{
   'use strict';
   
   return {
      
      // Intended to pre|post-process url parsing in concrete application
      // by mapping "swAppUrlConfig" to specific implementation.
      // See "swAppUrl"
      // 'source' - original url (string)
      // 'parse'  - function got string url and return parsed url
      parse: function(source, parse)
      {
         return parse(source);
      }
   
   };
   
});
