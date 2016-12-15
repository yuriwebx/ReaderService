/*global window: false */

define(['purl', 'swAppUrlConfig'], function(purl, swAppUrlConfig)
{
   'use strict';
      
   ////////////////////////////////////////////////////////////////////////////
   
   function _baseDir(url)
   {
      var base = url.attr('base');
      var dir =  url.attr('directory');
      var baseDir = base + dir;
      if ( baseDir.charAt(baseDir.length - 1) !== '/' )
      {
         baseDir += '/';
      }
      return baseDir;
   }
   
   function _withoutFragment(source)
   {
      // http://tools.ietf.org/html/rfc3986#page-24
      // A fragment identifier component is indicated by the presence of a
      // number sign ("#") character and terminated by the end of the URI.
      
      var s = source || '';
      var i = s.indexOf('#');
      return i !== -1 ? s.substring(0, i) : s;
   }
         
   function _parse(source)
   {
      var url = purl(source);
      
      return {
         
         modeNative: !!window.swAppUrl,
         modeWeb:     !window.swAppUrl,
            
         source:    url.attr('source'),
         base:      url.attr('base'),
         protocol:  url.attr('protocol'),
         authority: url.attr('authority'),
         userInfo:  url.attr('userInfo'),
         user:      url.attr('user'),
         password:  url.attr('password'),
         host:      url.attr('host'),
         port:      url.attr('port'),
         relative:  url.attr('relative'),
         path:      url.attr('path'),
         directory: url.attr('directory'),
         file:      url.attr('file'),
         query:     url.attr('query'),
         fragment:  url.attr('fragment'),
         params:    url.param(),
         baseDir:   _baseDir(url),
         withoutFragment: _withoutFragment(source)
      };
   }
   
   ////////////////////////////////////////////////////////////////////////////
   
   // If application is run in native container (phonegap, for example)
   // when url cannot be specified via browser address bar
   // then, by convention, the global 'swAppUrl' should be defined
   
   var source = window.swAppUrl || window.location.href;
   
   // let "swAppUrlConfig" to pre|post-process url parsing
   // see "swAppUrlConfigDefault"
   // see "swAppUrlConfig" mapping in main.js 
   return swAppUrlConfig.parse(source, _parse);
   
});
