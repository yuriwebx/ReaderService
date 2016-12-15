define([
      'module',
      'underscore',
      'swServiceFactory',
      'ClientNodeContext'],
   function (module,
             _,
             swServiceFactory,
             ClientNodeContext) {
      'use strict';

      swServiceFactory.create({
         module : module,
         service : [
            'swI18nService',
            'swUserService',
            'swSubmachine',
            'swApplicationToolbarService',
            'swProfileService',
            'swUserPublicationService',
            'swOfflineModeService',
            function (swI18nService,
                      swUserService,
                      swSubmachine,
                      swApplicationToolbarService,
                      swProfileService,
                      swUserPublicationService,
                      swOfflineModeService) {

               var config,
                  isWeb = ClientNodeContext.runtimeEngine === 'Web';

               this.configure = function (c) {
                  config = c;
               };

               this.getAllMenuSections = function () {
                  var userProfile = swProfileService.getProfile(),
                     isEditor = swApplicationToolbarService.isEditor(),
                     isFromClassEntered = swApplicationToolbarService.isFromClassEntered(),
                     isReadingState = swApplicationToolbarService.isReadingState(),
                     isPortalState = swApplicationToolbarService.isPortalState(),
                     isAdminState = swApplicationToolbarService.isAdminState();

                  if (isReadingState) {
                     config._menuSections[2] = _.without(config._menuSections[2], 'ResumeReading');
                  }
                  if (isReadingState && !_.includes(config._menuSections[1], 'Extras', 'ReadModeSettings')) {
                     config._menuSections[1].unshift('Extras');
                     config._menuSections[1].push('ReadModeSettings');
                  }

                  if (!isReadingState) {
                     config._menuSections[1] = _.without(config._menuSections[1], 'Extras', 'ReadModeSettings');
                  }

                  if (!isReadingState && !_.includes(config._menuSections[2], 'ResumeReading') && !isPortalState && !isAdminState) {
                     config._menuSections[2].splice(1, 0, 'ResumeReading');
                  }

                  if (!isFromClassEntered) {
                     config._menuSections[1] = _.without(config._menuSections[1], 'Overview');
                  }
                  else if (!_.includes(config._menuSections[1], 'Overview')) {
                     config._menuSections[1].unshift('Overview');
                  }

                  if (isEditor) {
                     config._menuSections[2] = _.without(config._menuSections[2], 'Flashcards', 'NewStudyProject');
                     config._menuSections[3] = _.without(config._menuSections[3], 'LibraryContentEditor');
                  }
                  else {
                     config._menuSections[2] = _.without(config._menuSections[2], 'CreateNewCourseSyllabus');

                     if (!isWeb || isWeb && !userProfile.adminRole && !userProfile.editorRole) {
                        config._menuSections[3] = _.without(config._menuSections[3], 'LibraryContentEditor');
                     }
                  }

                  if(userProfile.editorRole && !userProfile.adminRole){
                     config._menuSections[0] = _.without(config._menuSections[0], 'AdminApp');
                  }

                  if(!userProfile.editorRole) {
                     config._menuSections[0] = _.without(config._menuSections[0], 'AdminApp');
                     config._menuSections[0] = _.without(config._menuSections[0], 'EditorApp');
                  }

                  return config._menuSections;
               };

               this.selectMenuItem = function (menuItem) {
                  var deeplink = config[menuItem].deeplink;
                  if (deeplink) {
                     if (typeof deeplink === 'function') {
                        deeplink = deeplink();
                     }
                     if (deeplink) {
                        swSubmachine.deeplink(deeplink, 'ApplicationMenu_' + menuItem);
                     }
                  }
                  else if (config[menuItem].handler) {
                     config[menuItem].handler();
                  }
               };

               this.isMenuItemVisible = function (menuItem) {
                  return (
                     (
                     swUserService.isAuthenticated() &&
                     getMenuItemLoginRequired(menuItem) === 'shown'
                     ) ||
                     (
                     !swUserService.isAuthenticated() &&
                     getMenuItemLoginRequired(menuItem) === 'hidden'
                     ) ||
                     getMenuItemLoginRequired(menuItem) === 'ignore'
                     ) && getMenuItemConfigRequired(menuItem) &&
                     !(swOfflineModeService.isOffline() && getMenuItemOfflineRequired(menuItem) === 'hidden');
               };

               this.getMenuItemLocalizedName = function (menuItem) {
                  var isEditor = swApplicationToolbarService.isEditor();
                  var specialLocalizedName = ['ResumeReading'];
                  var lastRecentItem = swUserPublicationService.getLastRecentItem();

                  if (isEditor && specialLocalizedName.indexOf(menuItem) !== -1) {
                     menuItem = 'ResumeEditing';
                  }
                  else if (lastRecentItem.type === "StudyClass" && specialLocalizedName.indexOf(menuItem) !== -1) {
                     menuItem = 'ResumeStudy';
                  }

                  return swI18nService.getResource('ApplicationMenuItem.' + menuItem + '.label');
               };

               function getMenuItemLoginRequired(menuItem) {
                  return config[menuItem].loginStatus;
               }

               function getMenuItemOfflineRequired(menuItem) {
                  return config[menuItem].offlineStatus;
               }

               function getMenuItemConfigRequired(menuItem) {
                  var result;
                  if (typeof config[menuItem].config === 'function') {
                     result = config[menuItem].config();
                  }
                  else {
                     result = config[menuItem].config;
                  }
                  return result;
               }

            }]
      });
   });