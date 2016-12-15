/* global window */
define([
   'underscore'
],
function (_) {
   'use strict';

   var context = {};
   /* --- api --- */
   context.userAgentInfo = window.navigator.userAgent;
   context.native = !!window.cordova;
   context.platformType = _platformDetector();
   context.os = _osDetector();
   context.runtimeEngine = _runtimeEngineEnum();
   context.screenWidth = window.screen.width;
   context.screenHeight = window.screen.height;
   context.devicePixelRation = _detectDevicePixelRatio();
   context.origin = '';
   context.clientNodeId = _detectClientNodeId();

   return context;

   /* --- impl --- */

   function test(string, regex) {
      if (regex instanceof RegExp) {
         return regex.test(string);
      }
      else if (regex && Array.isArray(regex.and)) {
         return regex.and.every(_subTest);
      }
      else if (regex && Array.isArray(regex.or)) {
         return regex.or.some(_subTest);
      }
      else if (regex && regex.not) {
         return !test(string, regex.not);
      }
      else if (_.isFunction(regex)) {
         return regex(window);
      }
      else {
         return false;
      }

      function _subTest(item) {
         return test(string, item);
      }
   }

   function _detector(_enum) {
      return Object.keys(_enum).reduce(function (memo, key) {
         return (!memo && test(window.navigator.userAgent, _enum[key])) ? key : memo;
      }, '');
   }

   function _detectDevicePixelRatio() {
       // To account for zoom, change to use deviceXDPI instead of systemXDPI
       if (window.screen.systemXDPI  && window.screen.logicalXDPI && window.screen.systemXDPI > window.screen.logicalXDPI) {
           // Only allow for values > 1
           return window.screen.systemXDPI / window.screen.logicalXDPI;
       }
       return window.devicePixelRatio || 1;
   }

   function _detectClientNodeId() {
      if (window.cordova) {
         return window.device.uuid;
      }
      var localStorage = window.localStorage;
      var UUID_KEY = 'CLIENT_NODE_ID';

      var uuid = localStorage.getItem(UUID_KEY);
      if (!uuid) {
         uuid = _uuidGenerator();
         localStorage.setItem(UUID_KEY, uuid);
      }

      return uuid;
   }

   function _osDetector() {
      var OsEnum = {
         Windows  : {and: [{or: [/\bWindows|(Win\d\d)\b/, /\bWin 9x\b/]}, {not: /\bWindows Phone\b/}]},
         OSX      : /\bMac OS\b/,
         Linux    : /\bLinux\b/,
         iOS      : {or: [/\biPad\b/, /\biPhone\b/, /\biPod\b/]},
         Android  : /\bAndroid\b/,
         Other    : /./
      };
      return _detector(OsEnum);
   }

   function _platformDetector() {
      var MobileDeviceEnum = {
         Android     : /\bAndroid\b/,
         Ipad        : /\biPad\b/,
         Iphone      : /\biPhone\b/,
         Ipod        : /\biPod\b/,
         BlackBerry  : /\bblackberry\b/,
         FireFoxOs   : {and: [/\bFirefox\b/, /\bMobile\b/]},
         WinPhone    : /\bIEMobile\b/,
         PS4         : /\bMozilla\/5.0 \(PlayStation 4\b/,
         PSVita      : /\bMozilla\/5.0 \(Play(S|s)tation Vita\b/
      };

      var PlatformTypeEnum = {
         Mobile   : {or: _.values(MobileDeviceEnum)},
         Desktop  : /./
      };

      return _detector(PlatformTypeEnum);
   }

   function _runtimeEngineEnum() {
      var RuntimeEngineEnum = {
         Web      : function(window) {return !window.cordova; },
         iOS      : {or: [/\biPad\b/, /\biPhone\b/, /\biPod\b/]},
         Android  : /\bAndroid\b/,
         WinPhone : /\bIEMobile\b/,
         Windows  : {and: [{or: [/\bWindows|(Win\d\d)\b/, /\bWin 9x\b/]}, {not: /\bWindows Phone\b/}]},
         OSX      : /\bMac OS\b/,
         Linux    : /\bLinux\b/,
         Other    : /./
      };
      
      return _detector(RuntimeEngineEnum);
   }

   function _uuidGenerator() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, _replacer);

      function _replacer(c) {
         /*jshint bitwise: false*/
         /*jshint eqeqeq:  false*/
         var r = Math.random() * 16|0, v = c == 'x' ? r : (r&0x3|0x8);
         return v.toString(16);
      }
   }

});
