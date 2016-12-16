define([
   'module',
   'ngModule',
   'swLoggerFactory'

], function (module, ngModule, swLoggerFactory) {

   'use strict';

    var logger = swLoggerFactory.getLogger(module.id);
    logger.trace('create');

    ngModule.run([

        'swApplicationMenuService',
        'swGetSystemAboutInfoService',
        'swLoginService',
        'swManageUserProfileService',
        'swUserService',
        '$window',
        function(

            swApplicationMenuService,
            swGetSystemAboutInfoService,
            swLoginService,
            swManageUserProfileService,
            swUserService,
            $window
            )
        {
            logger.trace('run');

            var applicationMenuConfig = {
                _menuSections : [
                    ['Library',
                     'Admin Panel',
                     'Reports'
                    ],
                    ['LibraryContentEditor',
                     'Profile',
                     'Logout'
                    ],
                    [
                       'About'
                    ]
                ],
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
                          // swSubmachine.getStack()[0].submachine.go('Login');
                          $window.location.reload();
                       });
                    },
                    loginStatus: 'shown',
                    config: true
                },
                'Admin Panel' : {
                    deeplink: '/manageusers',
                    handler: null,
                    loginStatus: 'shown',
                    config: true
                },
                'Library' : {
                    deeplink: '/libraryview',
                    handler: null,
                    loginStatus: 'shown',
                    config: true
                },
                'Reports' : {
                    deeplink: '/managereports',
                    handler: null,
                    loginStatus: 'shown',
                    config: true
                },

                'LibraryContentEditor' : {
                    deeplink : null,
                    handler  : function () {
                       swUserService.goLibraryContentEditor();
                    },
                    loginStatus: 'shown',
                    config: true
                }
            };
            
            swApplicationMenuService.configure(applicationMenuConfig);
        }]);
});