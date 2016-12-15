define([
   'underscore',
   'swComponentFactory',
   'module',
   'Context',
   'text!./SocialSharing.html',
   'less!./SocialSharing'
], function (_, swComponentFactory, module, Context, template) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         sharingData: '=',
         viewConfig: '='
      },
      controller: [
         '$scope',
         '$window',
         'swI18nService',
         function ($scope, $window, swI18nService) {

            var viewModel = $scope,
                href,
                shareDialog,
                currentLocation = Context.applicationUrl + $window.location.hash,
                configData = Context.parameters.socialSharingConfig,
                POPUP_WIDTH = 500,
                POPUP_HEIGHT = 500,
                popupPosition = {
                   left : $window.outerWidth / 2 - POPUP_WIDTH / 2,
                   top  : $window.outerHeight / 2 - POPUP_HEIGHT / 2
                },
                buttonsMap = {
                   facebook : {
                      title     : swI18nService.getResource('SocialSharing.button.facebook.label'),
                      className : 'share-fb',
                      shareFn   : shareOnFacebook,
                      shareUrl  : '#',
                      visible   : true
                   },
                   twitter : {
                      title     : swI18nService.getResource('SocialSharing.button.twitter.label'),
                      className : 'share-tw',
                      shareFn   : shareOnTweeter,
                      shareUrl  : '#',
                      visible   : true
                   },
                   google : {
                      title     : swI18nService.getResource('SocialSharing.button.googlePlus.label'),
                      className : 'share-gp',
                      shareFn   : shareOnGooglePlus,
                      shareUrl  : '#',
                      visible   : true
                   },
                   email : {
                      title     : swI18nService.getResource('SocialSharing.button.email.label'),
                      className : 'share-em',
                      shareFn   : shareViaEmail,
                      shareUrl  : '#',
                      visible   : true
                   }
                };

            viewModel.buttons = configureButtons($scope.viewConfig, buttonsMap);

            function configureButtons (config, buttonsMap) {
               if ( !config || !config.visibleButtons ) {
                  return buttonsMap;
               }
               return setButtonsVisibility(config.visibleButtons, buttonsMap);

               function setButtonsVisibility (visibleButtonsArr, buttonsMap) {
                  return  _.mapValues(buttonsMap, function (val, key) {
                            if ( _.indexOf(visibleButtonsArr, key) === -1 ) {
                               val.visible = false;
                            }
                            return val;
                         });
               }
            }

            function setDefaultData (data, link) {
               // for case when 'sharingData' is empty, default data specified
               _.defaults(data, {
                  name             : swI18nService.getResource('App.SocialSharing.Name.label'),
                  shortDescription : swI18nService.getResource('App.SocialSharing.Description.label'),
                  fullDescription  : swI18nService.getResource('App.SocialSharing.Description.label'),
                  picture          : 'http://la-mansh.com.ua/images/kartinki/kartinki_articles/Green_open_book.png', //temp
                  link             : link,
                  redirectUri      : 'https://irls.isd.dp.ua/portal/close.html'
               });
            }

            function shareOnFacebook ($event)
            {
               $event.preventDefault();
               setDefaultData(viewModel.sharingData, currentLocation);
               href = configData.facebook.dialogHref +
                      'app_id='        + configData.facebook.appId +
                      '&display='      + configData.facebook.dialogRenderMethod +
                      '&name='         + encodeURIComponent(viewModel.sharingData.name) +
                      '&description='  + encodeURIComponent(viewModel.sharingData.fullDescription) +
                      '&picture='      + encodeURIComponent(viewModel.sharingData.picture) +
                      '&link='         + encodeURIComponent(viewModel.sharingData.link) +
                      '&redirect_uri=' + encodeURIComponent(viewModel.sharingData.redirectUri);
               openShareDialog();
            }

            function shareOnTweeter ($event)
            {
               $event.preventDefault();
               setDefaultData(viewModel.sharingData, currentLocation);
               href = configData.tweeter.dialogHref +
                      'text=' + encodeURIComponent(viewModel.sharingData.name + ' | ' + viewModel.sharingData.shortDescription) +
                      '&url=' + encodeURIComponent(viewModel.sharingData.link);
               openShareDialog();
            }

            function shareOnGooglePlus ($event)
            {
               $event.preventDefault();
               setDefaultData(viewModel.sharingData, currentLocation);
               href = configData.googlePlus.dialogHref + encodeURIComponent(viewModel.sharingData.link);
               openShareDialog();
            }

            function shareViaEmail ()
            {
               setDefaultData(viewModel.sharingData, currentLocation);
               viewModel.buttons.email.shareUrl = 'mailto:?subject=' + viewModel.sharingData.name +
                                                  '&body=' + viewModel.sharingData.name + '%0A%0A' +
                                                  viewModel.sharingData.fullDescription + '%0A%0A' +
                                                  viewModel.sharingData.link;
            }

            function openShareDialog () {
               shareDialog = $window.open(href, 'shareDialog', 'width=' + POPUP_WIDTH + ', ' +
                             'height=' + POPUP_HEIGHT + ', ' +
                             'top=' + popupPosition.top + ', ' +
                             'left=' + popupPosition.left);

               if (!!$window.cordova) {
                  shareDialog.addEventListener('loadstop', function (event) {
                     if ( !event.url )
                     {
                        return;
                     }

                     if ( !!event.url.match(viewModel.sharingData.redirectUri) || !!event.url.match('tweet/complete') )
                     {
                        shareDialog.close();
                     }
                  });
               }
               else {
                  $window.addEventListener('message', function (event) {
                     if (event.data === 'close') {
                        shareDialog.close();
                     }
                  }, false);
               }
            }
         }]
   });
});
