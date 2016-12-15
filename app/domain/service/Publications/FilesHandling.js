/* global XMLHttpRequest: false */
/* global window: false */
/* global Blob: false */
/* global FileReader: false */
/* global LocalFileSystem: false */
define([
   'module',
   'swLoggerFactory',
   'q', //?
   'underscore'
], function (module, swLoggerFactory, q, _) {
   'use strict';
   var logger = swLoggerFactory.getLogger(module.id);
   var exports = {};

   var
      $window = window,
      fileSystem = null,
      isFSAvavaiable = true,
      localFileSystemPrefix = '',
      namespacePrefix = '',
      SDCardPath = '',
      fsType = 0,
      fsSize = 1024 * 1024 * 1024;

   function errorHandler(e) {
      var msg = '';
      switch (e.code) {
         case 1:
            msg = 'NOT_FOUND_ERR';
         break;
         case 2:
            msg = 'SECURITY_ERR';
         break;
         case 4:
            msg = 'NOT_READABLE_ERR';
         break;
         case 7:
            msg = 'INVALID_STATE_ERR';
         break;
         case 9:
            msg = 'INVALID_MODIFICATION_ERR';
         break;
         case 10:
            msg = 'QUOTA_EXCEEDED_ERR';
         break;
         case 12:
            msg = 'PATH_EXISTS_ERR';
         break;
       default:
            msg = 'Unknown FS Error ' + e.code;
         break;
      }
      logger.error(msg);
   }

   function fsInit(cb) {
      cb = cb || _.noop;
      var eh = function (e) {
         isFSAvavaiable = false;
         errorHandler(e);
         cb();
      };
      function rFS() {
         if($window.cordova) {
            fsSize = 0;
            fsType = LocalFileSystem.PERSISTENT;
         }
         $window.requestFileSystem(fsType, fsSize, function (fs) {
            fileSystem = fs;
            cb();
         }, eh);
      }

      try {
         if (!fileSystem) {
            $window.PersistentStorage = $window.PersistentStorage || $window.webkitPersistentStorage;
            $window.requestFileSystem = $window.requestFileSystem || $window.webkitRequestFileSystem;
            $window.resolveLocalFileSystemURL = $window.resolveLocalFileSystemURL || $window.webkitResolveLocalFileSystemURL;
            if (!$window.requestFileSystem) {
               eh('Local filesystem is not supported by this browser');
            }
            else {
               if ($window.PersistentStorage) {
                  $window.PersistentStorage.requestQuota(fsSize, function(grantedBytes) {
                     fsSize = grantedBytes;
                     rFS();
                  });
               }
               else {
                  rFS();
               }
            }
         }
      }
      catch (e) {
         eh(e);
      }
   }

   function mkDir(folders, callback) {
      function createDir(dirEntry) {
         var folder = folders.shift();
         dirEntry.getDirectory(folder, {create : true}, function (dirEntry) {
            if (folders.length) {
               createDir(dirEntry);
            }
            else {
               callback(dirEntry);
            }
         }, errorHandler);
      }

      if (folders.length) {
         createDir(fileSystem.root, folders);
      }
      else {
         callback();
      }
   }

   function loadFilePartial(path, offset, size, callback, errorCallback) {
      var options = {
         offset : offset,
         size : size
      };
      _load(path, options, callback, errorCallback);
   }

   function loadFile(path, callback, errorCallback) {
      _load(path, {}, callback, errorCallback);
   }

   function _load(path, options, callback, errorCallback) {
      var onOpenFile = readEntire;

      if (!errorCallback) {
         errorCallback = errorHandler;
      }
      if (_.has(options, 'size') && _.has(options, 'offset')) {
         onOpenFile = readPartial;
      }
      if (isURL(path)) {
         $window.resolveLocalFileSystemURL(path, onReadFile, errorCallback);
      }
      else {
         fileSystem.root.getFile(path, {create : true}, onReadFile, errorCallback);
      }

      function readEntire(file) {
         var reader = new FileReader();
         reader.onloadend = function () {
            callback(this.result);
         };
         reader.readAsText(file);
      }
      function readPartial(file) {
         callback(file.slice(options.offset, options.size < 0 ? file.size : options.size));
      }
      function onReadFile(fileEntry) {
         fileEntry.file(onOpenFile, errorCallback);
      }
   }

   function isURL(string) { //is this enough?
      return /:\/\/?/.test(string);
   }

   function saveFile(data, path, callback, clear) {
      callback = callback || _.noop;
      clear = !!clear;

      if (clear) {
         fileSystem.root.getFile(namespacePrefix + path, {create : true}, function (fileEntry) {
            fileEntry.remove(function () {
               saveFile(data, path, callback, false);
            }, errorHandler);
         });
      }
      else {
         fileSystem.root.getFile(namespacePrefix + path, {create : true}, function (fileEntry) {
            fileEntry.createWriter(function (writer) {
               if (typeof data === 'string') {
                  data = new Blob([data], {type : 'text/plain'});
               }
               var written = 0;
               var BLOCK_SIZE = 1024 * 1024;

               var writeNext = function(cb) {
                  var sz = Math.min(BLOCK_SIZE, data.size - written);
                  var sub = data.slice(written, written + sz);
                  writer.write(sub);
                  written += sz;
                  writer.onwrite = function () {
                     if (written < data.size) {
                        writeNext(cb);
                     }
                     else {
                        cb();
                     }
                  };
               };

               writeNext(callback);
            }, errorHandler);
         }, errorHandler);
      }
   }

   function safeSaveFile(data, path, callback) {
      callback = callback || _.noop;
      var folders = (namespacePrefix + path).split('/');
      if ('' === folders[0]) {
         folders.shift();
      }
      folders.pop();
      mkDir(folders, function () {
         saveFile(data, path, callback);
      });
   }

   function saveFileFromUrl(url, destination, onProgress, callback) {
      var req = new XMLHttpRequest();
      req.onprogress = onProgress;
      req.open('GET', url, true);
      req.onreadystatechange = function () {
         if (req.readyState === 4 && req.status === 200) {
            safeSaveFile(req.response, destination, callback);
         }
      };
      req.responseType = "blob";
      req.send();
      return false;
   }

   function rmDir(path, callback) {
      var cb = callback || _.noop;
      var eh = function (e) {
         errorHandler(e);
         cb();
      };
      fileSystem.root.getDirectory(namespacePrefix + path, {create : true}, function (dirEntry) {
         dirEntry.removeRecursively(cb, eh);
      }, eh);
   }

   function rmFile (path, callback) {
      var cb = callback || _.noop;
      var eh = function (e) {
         errorHandler(e);
         cb();
      };
      fileSystem.root.getFile(namespacePrefix + path, {create : true}, function (fileEntry) {
         fileEntry.remove(cb, eh);
      }, eh);
   }

   //move this

   function scanDir(dirEntry, callback) {
      dirEntry.createReader().readEntries(function(entries) {
         var results = [];
         (function next() {
            var entry = entries.pop();
            if (!entry) {
               return callback(results);
            }
            if (entry.isDirectory) {
               checkDirEntry(entry, function (entryInfo) {
                  if (entryInfo.valid) {
                     results.push({
                        id          : entry.name,
                        path        : entry.fullPath,
                        content     : entryInfo.content,
                        cover       : entryInfo.cover,
                        audio       : entryInfo.audio || [],
                        alignment   : entryInfo.alignment || [],
                        metadata    : entryInfo.metadata,
                        outdated    : entryInfo.outdated
                     });
                     next();
                  }
                  else {
                     next();
                     // scanDir(entry, function(res) {
                     //    results = results.concat(res);
                     //    next();
                     // });
                  }
               });
            }
            else {
               next();
            }
         })();
      });
   }

   function checkDirEntry(dirEntry, callback) {
      var entryInfo = {
         valid : false,
         outdated : true
      };
      if (!dirEntry.name || dirEntry.name.length !== 32) {
         return callback(entryInfo);
      }
      dirEntry.createReader().readEntries(function (entries) {
         (function next() {
            var entry = entries.pop();
            if (!entry) {
               return callback(entryInfo);
            }
            switch (entry.name) {
               case 'content': case 'alignment' : case 'audio' : case 'cover': case 'metadata':
                  if (entry.name === 'content') {
                     entryInfo.valid = true;
                  }
                  entry.createReader().readEntries(function (entries) {
                     entryInfo[entry.name] = _.map(entries, 'name');
                     next();
                  });
               break;
               case 'publication.json':
                  entryInfo.outdated = false;
                  next();
               break;
               default:
                  next();
            }
         })();
      });
   }

   function checkInternalMemory() {
      return _check();
   }

   function checkSDCard(folder) {
      var SDCardURL = getSDCardPath();
      return SDCardURL ? _check(SDCardURL, folder) : [];
   }

   function _check(SDCardURL, folder) {
      var deferred = q.defer();
      var getDirEntry = _.bind(fileSystem.root.getDirectory, fileSystem.root, namespacePrefix, {});

      if (SDCardURL) {
         getDirEntry = _.partial($window.resolveLocalFileSystemURL, SDCardURL + '/' + folder);
      }

      getDirEntry(function (dirEntry) {
         scanDir(dirEntry, function (artifacts) {
            deferred.resolve(artifacts);
         });
      }, function (err) {
         logger.warn(err);
         deferred.resolve([]);
      });
      return deferred.promise;
   }

   function getSDCardPath () {
      // var lenovo = 'file:///storage/sdcard1';
      // var samsung = 'file:///storage/extSdCard';
      return SDCardPath;
   }

   var init = function (cb) {
      cb = cb || _.noop;

      if (isFSAvavaiable && fileSystem) {
         fileSystem.root.getFile('testfile.txt', {create : true}, function (fileEntry) {
            localFileSystemPrefix = fileEntry.toURL().replace('testfile.txt', '');
            fileEntry.remove(cb, cb);
         }, cb);
      }
      else {
         cb();
      }
   };

   exports.initFS = function (cb) {
      cb = cb || _.noop;
      fsInit(function () {
         if ($window.cordova && $window.cordova.getSDPath) {
            $window.cordova.getSDPath('', function (_path) {
               SDCardPath = _path;
               init(cb);
            }, function (err) {
               logger.error(err);
               init(cb);
            });
         }
         else {
            init(cb);
         }
      });
   };

   exports.checkSDCard = checkSDCard;
   exports.checkInternalMemory = checkInternalMemory;

   exports.saveFileFromUrl = saveFileFromUrl;
   exports.safeSaveFile = safeSaveFile;
   exports.saveFile = saveFile;
   exports.rmDir = rmDir;
   exports.rmFile = rmFile;
   exports.loadFile = loadFile;
   exports.loadFilePartial = loadFilePartial;
   exports.getSDCardPath = getSDCardPath;
   exports.isFSAvailable = function () {
      return isFSAvavaiable;
   };

   exports.setNamespacePrefix = function (prefix) {
      namespacePrefix = prefix;
      if (!/\/^/.test(namespacePrefix)) {
         namespacePrefix += '/';
      }
   };
   exports.getLocalPath = function () {
      return localFileSystemPrefix + namespacePrefix;
   };

   module.exports = exports;

});