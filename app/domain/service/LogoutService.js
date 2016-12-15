define([
 
   'jquery',
   'angular',
   'ngModule',
  
   ], function(
 
   $,
   ng,
   ngModule
  
   ){
  
   'use strict';
 
   ngModule.run(['swLogoutService', function(/*swLogoutService*/)
   {
      // We have to 'touch' swLogoutService here so that its constructor performs
      // some important operations at bootstrap time.
      // Otherwise (due to lazy initialization) it is performed too late:
      // when 'Logout' menu item is selected and Logout component is initialized.
   }]);
 
   ngModule.service('swLogoutService', ['$window', 'swRestService', function($window, swRestService) {

      var win = ng.element($window);

      function logoutSync() {
         var url = swRestService.getUrlString('ApplicationSession', '');

         $.ajax({
            url      : url,
            method   : 'DELETE',
            async    : false
         });
      }

      // chrome does not support properly?
      // http://www.w3schools.com/jsref/event_onunload.asp
      // https://code.google.com/p/chromium/issues/detail?id=321241
      // iOS: triggered on refresh and close-tab only
      win.on('unload', function()
      {
         logoutSync('requested by user (by unload)');
      });
   }]);
});