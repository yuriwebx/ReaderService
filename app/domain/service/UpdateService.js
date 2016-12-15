/* globals XMLHttpRequest: false */
/* global FileTransfer: false */
define([
      'module',
      'swServiceFactory',
      'Context',
      'swLoggerFactory'
   ],
   function (module, swServiceFactory, Context, swLoggerFactory) {
      'use strict';

      swServiceFactory.create({
         module : module,
         submachine: true,
         service : [
            '$q',
            '$window',
            '$timeout',
            'swResourcesAccessService',
            'swUserService',
            function ($q,
                      $window,
                      $timeout,
                      swResourcesAccessService,
                      swUserService) {

               var logger = swLoggerFactory.getLogger(module.id);
               var needUpdate = false;
               var needUpdateApk = false;
               var currentVersion = Context.parameters.buildVersion;
               var apkHash = Context.parameters.apkHash;
               var storedVersion = $window.localStorage.getItem('currentInstalledVersion');
               if (storedVersion) {
                  currentVersion = storedVersion;
               }
               var readyToReload = false;
               var timeOutms = 1000 * 60 * 15;
               var timeOutmsApk = 1000 * 60 * 60 * 15;

               var FS = swResourcesAccessService.getLocalFileSystemConnection();
               this.init = function () {
                  checkVersion();
                  ping(needUpdate, checkVersion, timeOutms);

                  //only for android
                  var isAndroid = /android/.test($window.navigator.userAgent.toLowerCase());
                  if($window.cordova && isAndroid) {
                     deleteUpdates();
                     checkApkVersion();
                     ping(needUpdateApk, checkApkVersion, timeOutmsApk);
                  }
               };

               function deleteUpdates(){
                  var localPath = $window.cordova.file.externalDataDirectory + 'filename.apk';
                  $window.resolveLocalFileSystemURL(localPath, function(fileEntry){
                     fileEntry.remove(function(){
                        logger.info("File removed!");
                     },function(){
                        logger.info("error deleting the file ");
                     },function(){
                        logger.info("file does not exist");
                     });
                  });
               }

               function checkVersion() {
                  if (!needUpdate) {
                     getFileFromUrl(Context.serverUrl + 'rest/info').then(function (response) {
                        if (response) {
                           try {
                              response = JSON.parse(response.toString());
                           }
                           catch (e) {
                              response = {};
                           }
                        }
                        if (response && response.version && response.version !== currentVersion && response.apkHash === apkHash) {
                           needUpdate = response.version;
                           doUpdate();
                        }
                     });
                  }
                  ping(needUpdate, checkVersion, timeOutms);
               }


               function checkApkVersion() {
                  if (!needUpdateApk) {
                     getFileFromUrl(Context.serverUrl + 'rest/info').then(function (response) {
                        if (response) {
                           try {
                              response = JSON.parse(response.toString());
                           }
                           catch (e) {
                              response = {};
                           }
                        }

                        if (response && response.apkHash && response.apkHash !== apkHash && swUserService.isAuthenticated()) {
                           needUpdateApk = response.apkHash;
                           updateAndroidApp();
                        }
                     });
                  }
                  ping(needUpdateApk, checkApkVersion, timeOutmsApk);
               }

               //no clients
               function ping(isUpdate, func, timeout) {
                  if (!isUpdate) {
                     $timeout(func, timeout);
                  }
               }

               function checkAbilityToReload() {
                  if (readyToReload) {
                     if (['', 'managepublications', 'dictionary', 'explore'].indexOf($window.location.hash.replace('#/', '')) > -1) {
                        $window.location.reload();
                     }
                     else {
                        $timeout(checkAbilityToReload, 500);
                     }
                  }
               }

               function doUpdate() {
                  if (!$window.cordova) {
                     readyToReload = true;
                     checkAbilityToReload();
                  }
                  else {
                     updateCordova();
                  }
               }

               function updateAndroidApp() {
                  var localPath = $window.cordova.file.externalDataDirectory + 'filename.apk',
                     downloadApkUrl =  Context.serverUrl + 'artifacts/' + Context.parameters.apkName + '.apk',
                     fileTransfer = new FileTransfer();
                  fileTransfer.download(downloadApkUrl, localPath, function(entry) {
                     $window.plugins.webintent.startActivity({
                           action: $window.plugins.webintent.ACTION_VIEW,
                           url: entry.toURL(),
                           type: 'application/vnd.android.package-archive'
                        },
                        function(){

                        },
                        function(){
                           logger.info('Error launching app update');
                        }
                     );

                  }, function (error) {
                     logger.info("Error downloading APK: " + error.code);
                  });
               }

               function updateCordova() {
                  var platform = 'android';
                  if (/(iphone|ipod|ipad).*/.test($window.navigator.userAgent.toLowerCase())) {
                     platform = 'ios';
                  }
                  var saveDir = 'update/';
                  var index = 'index_reader_' + platform + '.html';
                  getFileFromUrl(Context.serverUrl + 'reader/' + index)
                     .then(function (content) {
                        content = content.toString();
                        var m = content.match(/main-built-reader-[0-9a-f]+-cached.js/);
                        if (m && m[0]) {
                           getFileFromUrl(Context.serverUrl + 'reader/' + m[0]).then(function (content) {
                              FS.safeSaveFile(content, saveDir + m[0], function () {
                                 $window.localStorage.setItem('pathToCachedJS', FS.getLocalPath() + saveDir + m[0]);
                                 $window.localStorage.setItem('currentInstalledVersion', needUpdate);
                                 readyToReload = true;
                                 checkAbilityToReload();
                              });
                           });
                        }
                     });
               }


               function getFileFromUrl(url) {
                  var defer = $q.defer();
                  var req = new XMLHttpRequest();
                  req.open('GET', url, true);
                  req.onreadystatechange = function () {
                     if (req.readyState === 4 && req.status === 200) {
                        defer.resolve(req.response);
                     }
                  };
                  req.responseType = "text";
                  req.send();
                  return defer.promise;
               }
            }

         ]
      });
   });

