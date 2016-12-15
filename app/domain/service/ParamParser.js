(function(window) {
   'use strict';

   define([], function()
   {

      /**
       * Parses url parameters and creates object with results
       * 
       * @return {Object} { paramKey1: paramValue1, paramKey2: paramValue2,
       *         etc... }
       */

      function setObject(name, value, context)
      {
         var parts = name.split("."), p = parts.pop();
         for (var i = 0, j; context && (j = parts[i]); i++)
         {
            context = (j in context ? context[j] : context[j] = {});
         }
         return context && p ? (context[p] = value) : undefined; // Object
      }

      return {
         parseUrl : function(url)
         {
            var searchString = url.split('?')[1];
            if (!searchString)
            {
               return {};
            }
            searchString = searchString.replace('?');
            var paramsArray = searchString.split('&');
            var params = {};
            paramsArray.forEach(function(param)
            {
               if (param)
               {
                  var paramKey = param.split('=')[0];
                  var paramValue = window.decodeURIComponent(param.split('=')[1]);
                  setObject(paramKey, paramValue, params);
               }
            });
            return params;
         },

         parse : function(paramsObject)
         {
            var params = {};
            for (var i in paramsObject)
            {
               if (paramsObject.hasOwnProperty(i))
               {
                  setObject(i, paramsObject[i], params);
               }
            }
            return params;
         },

         isRelativePath : function(path)
         {
            return path.indexOf('.') === 0;
         },

         toAbsolute : function(path)
         {
            var currentDir = window.process.cwd();
            return currentDir + '/' + path;
         }
      };
   });
}(this));
