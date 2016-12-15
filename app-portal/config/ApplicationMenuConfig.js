define([
   'module',
   'ngModule',
   'swLoggerFactory',
   'Context'
], function (module, ngModule, swLoggerFactory, Context) {

   'use strict';

    var logger = swLoggerFactory.getLogger(module.id);
    logger.trace('create');

    ngModule.run([
        '$window',
        'swApplicationMenuService',
        'swGetSystemAboutInfoService',
        'swLoginService',
        'swManageUserProfileService',
        function(
            $window,
            swApplicationMenuService,
            swGetSystemAboutInfoService,
            swLoginService,
            swManageUserProfileService
            )
        {
            logger.trace('run');

            var applicationMenuConfig = {
                _menuSections : [
                    ['AdminApp',
                     'EditorApp'],
                    ['Profile',
                     'Logout'],
                    ['About']
                ],
                'AdminApp' : {
                    deeplink : null,
                       handler  : function () {
                          goToApplication('admin');
                    },
                    loginStatus: 'shown',
                    config: true
                 },
                'EditorApp' : {
                   deeplink : null,
                      handler  : function () {
                          goToApplication('editor');
                      },
                   loginStatus: 'shown',
                   config: true
                },
                'Profile' : {
                    deeplink: null,
                    handler: function () {
                        swManageUserProfileService.showUserProfilePopup('Personal');
                    },
                    loginStatus: 'shown',
                    config: true
                },
                'About' : {
                    deeplink: null,
                    handler: function () {
                        swGetSystemAboutInfoService.showAboutPopup();
                    },
                    loginStatus: 'ignore',
                    config: true
                },
                'Logout' : {
                    deeplink: null,
                    handler: function () {
                       //debugger;//service client - result is not used 
                       swLoginService.logout().then(function(){
                            $window.location.reload();
                       });
                    },
                    loginStatus: 'shown',
                    config: true
                }
            };

            function goToApplication(application){
               var serverUrl = Context.serverUrl,
                  appUrl    = Context.applicationUrl.replace(serverUrl, ''),
                  url;

               url = Context.serverUrl + appUrl.replace('portal', application);
               $window.open(url);
            }

            swApplicationMenuService.configure(applicationMenuConfig);
        }]);
});