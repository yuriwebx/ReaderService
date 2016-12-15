/* global XMLHttpRequest: false */
define([
   'module',
   'swServiceFactory',
   'underscore',
   'Context',
   'swLoggerFactory'
],
function (module, swServiceFactory, _, Context, swLoggerFactory) {
   'use strict';
   var logger = swLoggerFactory.getLogger(module.id);
   swServiceFactory.create({
      module : module,
      service : ['$q', '$window', 'swResourcesAccessService', 'swRestService', 'swOfflineModeService',
      function ($q, $window, swResourcesAccessService, swRestService, swOfflineModeService) {
         /* --- api --- */

         this.init   = init;
         this.get    = _getItem; //name
         this.has    = _has; //name
         this.getStaticResource = getStaticResource;
         this.getSDCardInfo = getSDCardInfo;

         /* --- impl --- */

         var db = swResourcesAccessService.getLocalRepositoryConnection();
         var fs = swResourcesAccessService.getLocalFileSystemConnection();

         var INTERNAL_FS_PATH = '';
         var EXTERNAL_FS_PATH = '';
         var SDCARD_FOLDER    = '';
         var IS_INTERNAL_FS_AVAILABLE = false;
         var IS_EXTERNAL_FS_AVAILABLE = false;

         var downloadManagerState = {};
         var defaultCoverExtension = '.png';
         var vPlaceholder = '{version}';
         var sPlaceholder = '{size}';

         function init () {
            SDCARD_FOLDER = _.get(Context, 'parameters.brand', '').toLowerCase() + '.reader.content';
            INTERNAL_FS_PATH = fs.getLocalPath();
            EXTERNAL_FS_PATH = fs.getSDCardPath();
            IS_INTERNAL_FS_AVAILABLE = fs.isFSAvailable();
            IS_EXTERNAL_FS_AVAILABLE = Boolean(EXTERNAL_FS_PATH);

            downloadManagerState = {};
            return checkWebpFeature()
            .then(function () {
               return $q.all([
                  IS_INTERNAL_FS_AVAILABLE ? fs.checkInternalMemory() : [],
                  IS_EXTERNAL_FS_AVAILABLE ? fs.checkSDCard(SDCARD_FOLDER) : []
               ]);
            })
            .then(function (response) {
               /* new names for outdated and uptodate */
               var onDevice = _.groupBy(response[0], function (item) {
                  return item.outdated ? 'outdated' : 'uptodate';
               });
               var onSDCard = _.indexBy(response[1].filter(function (item) {
                  return !item.outdated;
               }), 'id');
               var uptodate = _.indexBy(onDevice.uptodate || {}, 'id');
               var outdated = _.map(onDevice.outdated || [], 'id');

               _.each(onSDCard, _.partial(parseVersionObj, 'onSDCard'));
               _.each(uptodate, _.partial(parseVersionObj, 'onFs'));

               return removeItemsFromFs(outdated).then(function () {
                  return db.getAll();
               });
            })
            .then(function (localMetaList) {
               var inDB = _.map(localMetaList, '_id');
               var onFs = _.keys(downloadManagerState);

               var updateRequests = _.difference(onFs, inDB).map(function (id) {
                  return requestForDetails(id); //if offline or cell that no update maybe?
               });
               var removeRequests = [];

               localMetaList.forEach(function (details) {
                  var id = details._id;
                  if (!downloadManagerState[id]) {
                     removeRequests.push(db.remove(id));
                  }
                  else if (!details.version) {
                     updateRequests.push(requestForDetails(id));
                  }
                  else {
                     downloadManagerState[id].updateVersions(details.version);
                  }
               });
               return $q.all(removeRequests).then(function () {
                  return $q.all(updateRequests);
               });
            })
            .catch(function (err) {
               logger.error(err);
               return []; //create something like q.allSettled maybe?
            })
            .then(function (responses) {
               var updateRequests = []; //rename me
               responses.forEach(function (response) {
                  var details = response.data;
                  var id = response.id;
                  if (isInvalidResponse(response) || !details.version) {
                     delete downloadManagerState[id];
                  }
                  else {
                     downloadManagerState[id].updateVersions(details.version);
                     updateRequests.push(db.set(response.id, details));
                  }
               });
               return $q.all(updateRequests);
            })

            .catch(function (err) { //clients always expect resolved promise!
               logger.error(err);
               downloadManagerState = {};
            });
         }

         function parseVersionObj (type, info, id) {
            var trackingItem = _getItem(id);
            _.each(_.pick(info, ['alignment', 'audio', 'content', 'cover', 'metadata']), function (versions, prop) {
               _.each(versions, function (version) {
                  trackingItem[prop].update(version, type);
               });
            });
            if (info.cover && info.cover.indexOf(defaultCoverExtension) < 0) {
               trackingItem.coverExtension = info.cover[0];
            }
         }

         function _getItem (id) {
            if (!downloadManagerState[id]) {
               downloadManagerState[id] = new TrackingItem(id);
            }
            return downloadManagerState[id];
         }

         function _has (id) {
            return downloadManagerState[id];
         }

         function Version () {
            this.actual    = '';
            this.current   = '';
            this.available = [];
            this.onFs      = [];
            this.onSDCard  = [];
         }

         Object.defineProperties(Version.prototype, {
            outdated : {
               get : function outdated() {
                  return this.available.indexOf(this.actual) < 0;
               }
            },
            isOnFs : {
               get : function isOnFs () {
                  return this.available.length > 0 && this.onFs.indexOf(this.current) > -1;
               }
            },
            isOnSDCard : {
               get : function isOnSDCard () {
                  return this.available.length > 0 && this.onSDCard.indexOf(this.current) > -1;
               }
            }
         });

         Version.prototype.set = function set (version) {
            this.actual = version;
            if (!this.current || this.available.indexOf(version) > -1) {
               this.current = version;
            }
         };

         Version.prototype.update = function update (version, location) {
            this.actual = version;
            this.current = this.actual;
            if (location && (location === 'onFs' || location === 'onSDCard')) {
               this.available = _.union(this.available, [version]);
               this[location] = _.union(this[location], [version]);
            }
         };

         Version.prototype.flush = function flush () {
            this.current = this.actual;
            this.available = [];
         };

         function TrackingItem (id) {
            this.id = id;
            this.content   = new Version();
            this.cover     = new Version();
            this.audio     = new Version();
            this.alignment = new Version();
            this.metadata  = new Version();
         }

         Object.defineProperties(TrackingItem.prototype, {
            isDownloadAvailable : {
               get : function isDownloadAvailable () {
                  return IS_INTERNAL_FS_AVAILABLE && !swOfflineModeService.isOffline();
               }
            },
            contentIndex : {
               get : function contentIndex () {
                  return Context.parameters.contentConfig.contentIndex
                     .replace(vPlaceholder, this.content.current);
               }
            },
            contentSource : {
               get : function contentSource () {
                  return Context.parameters.contentConfig.contentSource
                     .replace(vPlaceholder, this.content.current);
               }
            },
            audioIndex : {
               get : function audioIndex () {
                  return Context.parameters.contentConfig.audioIndex
                     .replace(vPlaceholder, this.alignment.current);
               }
            },
            audioSource : {
               get : function audioSource () {
                  return Context.parameters.contentConfig.audioSource
                     .replace(vPlaceholder,  this.audio.current) + _.get(this.audio, 'files[0]', ''); // (!)
               }
            },
            audioIndexDiff : {
               get : function audioIndexDiff () {
                  return Context.parameters.contentConfig.audioIndexDiff
                     .replace(vPlaceholder, this.audio.current);
               }
            },
            coverSource : {
               get : function cover () {
                  return Context.parameters.contentConfig.coverSource
                     .replace(vPlaceholder, this.cover.current);
               }
            },
            isDownloaded : {
               get : function isDownloaded() {
                  return Boolean(this.content.available.length);
               }
            },
            isAudioDownloaded : {
               get : function isAudioDownloaded() {
                  return Boolean(this.audio.available.length && this.alignment.available.length);
               }
            },
            contenIndexPath : {
               get : createGetter('contentIndex', 'content')
            },
            contentSourcePath : {
               get : createGetter('contentSource', 'content')
            },
            audioIndexPath : {
               get : createGetter('audioIndex', 'audio')
            },
            audioSourcePath : {
               get : createGetter('audioSource', 'audio')
            },
            audioIndexDiffPath : {
               get : createGetter('audioIndexDiff', 'audio')
            },
            coverPath : {
               get : createGetter('coverSource', 'cover')
            }
         });

         function createGetter (property, prefix) {
            return function () {
               if (this[prefix].isOnFs) {
                  return INTERNAL_FS_PATH + this.id + '/' + this[property];
               }
               else if (this[prefix].isOnSDCard) {
                  return EXTERNAL_FS_PATH + '/' + SDCARD_FOLDER + '/' + this.id + '/' + this[property];
               }
               else {
                  return Context.downloadUrl + Context.parameters.EpubConfig.FilesPath + this.id + '/' + this[property];
               }
            };
         }

         TrackingItem.prototype.getCoverPath = function getCoverPath (size, cover, useServerUrl) {
            var path, salt = size ? '_' : '';
            if (!this.cover.current && !/^studyguide/i.test(cover)) {
               this.cover.update(cover);
            }
            if (useServerUrl) {
               path = Context.downloadUrl + Context.parameters.EpubConfig.FilesPath +
                  this.id + '/' + Context.parameters.contentConfig.coverSource.replace(vPlaceholder, this.cover.current);
            }
            else {
               path = this.coverPath;
            }
            return path.replace(sPlaceholder, salt + size) + defaultCoverExtension;
         };

         TrackingItem.prototype.updateVersions = function updateVersions (versions) {
            var actual = versions[0];
            this.content.set(actual.content);
            this.cover.set(actual.cover);
            this.metadata.set(actual.metadata);
            if (actual.audio) {
               this.audio.set(actual.audio.audio);
               this.audio.files = actual.audio.files;
               this.alignment.set(actual.audio.alignment);
            }
         };

         TrackingItem.prototype.udpateInfo = function udpateInfo (bookDetails) {
            var self = this;
            return $q.when(bookDetails || requestForDetails(self.id))
               .then(function (response) {
                  bookDetails = response.data || response;
                  if (!bookDetails.version) {
                     return $q.reject('Book has no version and cannot be opened');
                  }
                  self.updateVersions(bookDetails.version);
                  return bookDetails;
               });
         };

         TrackingItem.prototype.getContentFilesList = function getContentFilesList () {
            if (!this.content.actual || !this.cover.actual || !this.metadata.actual) {
               throw new Error('Book has no version and cannot be downloaded');
            }
            var self = this;
            var conf = Context.parameters.contentConfig;
            var contentFiles = [conf.contentIndex, conf.contentSource, conf.contentMeta]
               .map(function (path) {
                  return path.replace(vPlaceholder, self.content.actual);
               });
            var coverFiles = _.values(Context.parameters.thumbsPathes).concat([''])
               .map(function (path) {
                  var salt = path ? '_' : '';
                  return conf.coverSource.replace(vPlaceholder, self.cover.actual)
                     .replace(sPlaceholder, salt + path) + defaultCoverExtension;
               })
               .concat(conf.coverMeta.replace(vPlaceholder, self.cover.actual));
            var metaFile = conf.metadata.replace(vPlaceholder, self.metadata.actual);

            return contentFiles.concat(coverFiles).concat(['publication.json', metaFile]);
         };

         TrackingItem.prototype.getAudioFilesList = function getAudioFilesList () {
            if (!this.audio.actual || !this.alignment.actual) {
                throw new Error('Audio has no version and cannot be downloaded');
            }
            var self = this;
            var conf = Context.parameters.contentConfig;
            var audioFiles = [conf.audioSource, conf.audioIndexDiff, conf.audioMeta]
               .map(function (path) {
                  return path.replace(vPlaceholder, self.audio.actual);
               });
            audioFiles[0] += self.audio.files; //replace this when files become an array
            audioFiles.push(conf.audioIndex.replace(vPlaceholder, self.alignment.actual));

            return audioFiles;
         };

         TrackingItem.prototype.downloadBook = function downloadBook () {
            var bookDetails = null;
            var self = this;

            if (self.isDownloaded && (!self.isDownloadAvailable || self.content.isOnSDCard)) {
               return $q.when();
            }
            return self.udpateInfo()
               .then(function (response) {
                  bookDetails = response;
                  return db.set(self.id, bookDetails);
               })
               .then(function () {
                  return downloadFiles(self.id, self.getContentFilesList(), bookDetails.bookSize);
               })
               .then(function () {
                  self.content.update(self.content.actual, 'onFs');
                  self.cover.update(self.cover.actual, 'onFs');
                  self.metadata.update(self.metadata.actual, 'onFs');
               });
         };

         TrackingItem.prototype.removeBook = function removeBook () {
            var deferred = $q.defer();
            var self = this;

            fs.rmDir(self.id, function () {
               _.each(self, function (value, asset) {
                  if (value instanceof Version) {
                     self[asset].flush();
                  }
               });
               db.remove(self.id).then(deferred.resolve, deferred.reject);
            });
            return deferred.promise;
         };

         TrackingItem.prototype.downloadAudio = function downloadAudio () {
            var self = this;
            if (!self.isDownloaded) {
               throw new Error('Attempt to download audio separately');
            }
            if (self.isAudioDownloaded && (!self.isDownloadAvailable || self.audio.isOnSDCard)) {
               return $q.when();
            }
            return db.get(self.id)
               .then(function (details) {
                  return downloadFiles(self.id, self.getAudioFilesList(), details.mediaSize);
               })
               .then(function () {
                  self.audio.update(self.audio.actual, 'onFs');
                  self.alignment.update(self.alignment.actual, 'onFs');
               });
         };

         TrackingItem.prototype.removeAudio = function removeAudio () { //rejection?
            var deferred = $q.defer();
            var self = this;

            fs.rmDir(self.id + '/audio', function () {
               self.audio.flush();
               fs.rmDir(self.id + '/alignment', function () {
                  self.alignment.flush();
                  deferred.resolve();
               });
            });
            return deferred.promise;
         };

         function requestForDetails(id) {
            return $q.when(swRestService.call('get', 'Publications', 'details', {id : id}))
               .then(function (response) {
                  return {
                     id : id,
                     data : response.data
                  };
               });
         }

         function isInvalidResponse (response) {
            return _.has(response.data, 'statusMessages');
         }

         function downloadFiles (id, files, size) {
            var serverUrl = Context.downloadUrl;
            var filesLoaded = 0;
            var sizesLoaded = [];
            var fileUrl = '';
            var filePath = '';
            var deferred = $q.defer();

            function updateProgress (it) {
               return function (e) {
                  sizesLoaded[it] = e.loaded;
                  getProgress();
               };
            }

            function getProgress () {
               var s = 0;
               for (var i = 0; i < sizesLoaded.length; i++) {
                  s += sizesLoaded[i];
               }
               s = Math.round(100 * s / (size || 1)) + '%';
               deferred.notify(s);
            }

            function fileSaved (err) {
               if (err) {
                  deferred.reject();
               }
               else {
                  filesLoaded++;
                  if (filesLoaded === files.length) {
                     deferred.resolve();
                  }
               }
            }

            for (var i = 0; i < files.length; i++) {
               fileUrl = serverUrl + Context.parameters.EpubConfig.FilesPath + id + '/' + files[i];
               filePath = id + '/' + files[i];
               saveFileFromUrl(fileUrl, filePath, updateProgress(i), fileSaved);
            }

            return deferred.promise;
         }

         function getSDCardInfo () {
            return _.transform(downloadManagerState, function (result, item) {
               if (!_.isUndefined(item) && item.content.isOnSDCard) {
                  result[0]++;
                  if (item.audio.isOnSDCard) {
                     result[1]++;
                  }
               }
               return result;
            }, [0, 0]);
         }

         function removeItemsFromFs (ids) {
            var deferred = $q.defer();
            (function removeOne() {
               if (!ids.length) {
                  deferred.resolve();
               }
               else {
                  fs.rmDir(ids.pop(), removeOne);
               }
            })();
            return deferred.promise;
         }

         function saveFileFromUrl (url, destination, onProgress, callback) {
            getStaticResource(url)
               .then(function (data) {
                  fs.safeSaveFile(data, destination, callback);
               }, callback, onProgress);
         }

         function getStaticResource (url, type) {
            var deferred = $q.defer();
            var req = new XMLHttpRequest();

            req.onprogress = deferred.notify;
            req.onreadystatechange = function () {
               if (req.readyState === 4) {
                  if (!req.status || req.status >= 400 ) {
                     deferred.reject(new Error());
                  }
                  else {
                     deferred.resolve(req.response);
                  }
               }
            };
            req.open('GET', url, true);
            req.responseType = type || 'blob';
            req.send();
            return deferred.promise;
         }

         function checkWebpFeature () {
            var deferred = $q.defer();
            var img = $window.document.createElement('img');
            img.onload = function () {
               if ((img.width > 0) && (img.height > 0)) {
                  defaultCoverExtension = '.webp';
                  deferred.resolve();
               }
            };
            img.onerror = deferred.resolve;
            img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
            return deferred.promise;
         }

      }]
   });
});
