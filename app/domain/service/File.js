/*jslint camelcase: false */
define([
   'angular',
   'module',
   'swServiceFactory',
   'ClientNodeContext',
   'Context',
], function(angular, module, swServiceFactory, ClientNodeContext, Context)
{
   'use strict';
   
   swServiceFactory.create({
      module  : module,
      service : ['$window', '$log', '$q',
      function   ($window,   $log ,  $q)
      {
         $window.requestFileSystem = $window.requestFileSystem ||
         $window.webkitRequestFileSystem;
         $window.LocalFileSystem = $window.LocalFileSystem || {
            PERSISTENT : $window.PERSISTENT,
            TEMPORARY  : $window.TEMPORARY
         };
         $window.PersistentStorage = $window.navigator.PersistentStorage ||
            $window.navigator.webkitPersistentStorage || {
               requestQuota : function(size, callback) {
                  $log.debug('Fake implementation!');
                  callback(size);
               }
            };
         var FSConfig = Context.parameters.FSConfig;
         
         var fileTransfer;
         var fileSystem;
         var fileSystemDeferredInit = $q.defer();
         
         /**
          * Creates initial directory structure
          * ---\[RootDirName]
          * ------\[EpubDirName]
          * ------\[TempDirName]
          * ---------\[EpubDirName]
          */
         function initFileSystem(fileSystemObject) {
            $log.info('Starting to initialize file system');
            try {
               fileSystem = fileSystemObject;
               
               var rootDirDeferred = $q.defer();
               var epubDirDeferred = $q.defer();
               var tempDirDeferred = $q.defer();
               var tempEbubDirDeferred = $q.defer();
               
               var allPromises = [
                  rootDirDeferred.promise,
                  epubDirDeferred.promise,
                  tempDirDeferred.promise,
                  tempEbubDirDeferred.promise
               ];
               
               $log.debug('Creating / dir');
               fileSystem.root.getDirectory(FSConfig.RootDirName,
                  {create: true, exclusive: false},
                  function(rootDirEntry) {
                     $log.debug('/ dir created');
                     rootDirDeferred.resolve(rootDirEntry);
                     $log.debug('Creating /epub dir');
                     rootDirEntry.getDirectory(FSConfig.EpubDirName,
                        {create: true, exclusive: false},
                        function(epubDirEntry) {
                           $log.debug('/epub dir created');
                           epubDirDeferred.resolve(epubDirEntry);
                        },
                        function(error) {
                           $log.error('Error, while creating /epub dir');
                           epubDirDeferred.reject(error.code);
                        }
                     );
                     $log.debug('Creating /temp dir');
                     rootDirEntry.getDirectory(FSConfig.TempDirName,
                        {create: true, exclusive: false},
                        
                        function(tempDirEntry) {
                           $log.debug('/temp dir created');
                           tempDirDeferred.resolve(tempDirEntry);
                           tempDirEntry.getDirectory(FSConfig.EpubDirName,
                              {create: true, exclusive: false},
                              function(tempEpubDirEntry) {
                                 $log.debug('/temp/epub dir created');
                                 tempEbubDirDeferred.resolve(tempEpubDirEntry);
                              }, function(error) {
                                 $log.error('Error, while creating /temp/epub dir');
                                 tempEbubDirDeferred.reject(error.code);
                              }
                           );
                        },
                        function(error) {
                           $log.error('Error, while creating /temp dir');
                           tempDirDeferred.reject(error.code);
                        }
                     );
                  },
                  function(error) {
                     $log.error('Error, while creating / dir');
                     rootDirDeferred.reject(error.code);
                  }
               );
               $q.all(allPromises).then(function() {
                  $log.info('File system initialization success');
                  fileSystemDeferredInit.resolve();
               }, function() {
                  $log.error('File system initialization failure');
                  fileSystemDeferredInit.reject();
               });
               
            } catch (ex) {
               $log.error('File system initialization failure');
               $log.error(ex.message);
               return;
            }
         }
         
         /**
          * <summary>
          * Lazy initializes file system object and returns it
          * </summary>
          * @returns file system object
          */
         function getFileSystem() {
            var deferred = $q.defer();
            if (angular.isUndefined(fileSystem))
            {
               $window.PersistentStorage.requestQuota(FSConfig.Size,
                  function(grantedBytes) {
                     if (grantedBytes < FSConfig.Size)
                     {
                        $log.warn('Requested: ' + FSConfig.Size + ' bytes\n' + 'Granted: ' + grantedBytes +
                              ' bytes');
                     }
                     else
                     {
                        $log.info('Granted: ' + grantedBytes + ' bytes');
                     }
                     try {
                        var type = ClientNodeContext.os === 'Android' ?
                              $window.LocalFileSystem.TEMPORARY :
                              $window.LocalFileSystem.PERSISTENT;
                        $window.requestFileSystem(type, grantedBytes,
                           initFileSystem,
                              function(evt) {
                           $log.error('File system initialization failure');
                           $log.error('Error code: ' + evt.target.error.code);
                           deferred.reject();
                        });
                        fileSystemDeferredInit.promise.then(function() {
                           deferred.resolve(fileSystem);
                        });
                     } catch (error) {
                        this.logger.error('File system initialization failure', error);
                        deferred.reject();
                     }
               }, function(error) {
                  $log.error('Error, while requesting quota', error);
                  deferred.reject();
               });
            }
            else
            {
               deferred.resolve(fileSystem);
            }
            return deferred.promise;
         }
         
         /**
          * <summary>
          * Gets directory. If it doesn't - then creates it
          * </summary>
          * 
          * @param {string} path path to directory
          */
         this.getDirectory = function(path) {
            var deferred = $q.defer();
            var options = {
               create    : true,
               exclusive : false
            };
            getFileSystem().then(function(fileSystem) {
               fileSystem.root.getDirectory(
                  path,
                  options,
                  function(entry){
                     deferred.resolve(entry);
                  }, function(error) {
                     $log.error('Error, getting dir "' + path + '"');
                     deferred.reject(error.code);
                  });
               },
               function(error) {
                  $log.error('Error, getting dir "' + path + '"');
                  deferred.reject(error.code);
               }
            );
            return deferred.promise;
         };
         
         /**
          * <summary>
          * Saves file into File System
          * </summary>
          * 
          * If file not exists - it will be created
          * 
          * @param {string|blob} data file content
          * @param {string} path path to file
          * @param {object} options object, which may be:
          * <ul>
          * <li>create: Indicates that the file or directory should be created if 
          * it does not already exist. (boolean)</li>
          * <li>exclusive: Has has no effect by itself, but when used with create
          * causes the file or directory creation to fail if the target path 
          * already exists. (boolean)</li> 
          * <li>type: mime type of data for correct blob creation. Defaults
          * to text/plain</li>
          * </ul>
          * options.create = true will be enforced! 
          * 
          */
         this.saveFile = function(data, path, options) {
            var opts = options || {};
            opts.create = true;
            opts.type = opts.type || 'text/plain';
            var isAppend = opts.append;
            var deferred = $q.defer();
            getFileSystem().then(function(fileSystem) {
               fileSystem.root.getFile(
                  path,
                  opts,
                  function(entry){
                     entry.createWriter(function(writer) {
                        if (isAppend)
                        {
                           writer.seek(writer.length);
                        }
                        if (ClientNodeContext.os === 'Android')
                        {
                           writer.write(data);
                        }
                        else
                        {
                           var blob = new $window.Blob([data], {
                              type : opts.type
                           });
                           writer.write(blob);
                        }
                        writer.onwrite = function() {
                           $log.debug('File saved');
                           deferred.resolve(entry);
                        };
                        writer.onerror = function() {
                           $log.error('Error, writing to file');
                           deferred.reject();
                        };
                     }, function(error) {
                        $log.error('Error, creating file writer');
                        deferred.reject(error.code);
                     });
                  },
                  function(error) {
                     $log.error('Error, getting file "' + path + '"');
                     deferred.reject(error.code);
                  }
               );
            }, function() {
               deferred.reject();
            });
            return deferred.promise;
         };
         
         /**
          * <summary>
          * Retrieves file from FileSystem
          * </summary>
          * 
          * @param {string} pathToFile path to file
          * @param {object} options object, which may be:
          * 
          * <ul>
          * <li>create: Indicates that the file or directory should be created if 
          * it does not already exist. (boolean)</li>
          * <li>exclusive: Has has no effect by itself, but when used with create
          * causes the file or directory creation to fail if the target path 
          * already exists. (boolean)</li>
          * </ul>
          * 
          * @returns {Promise} promise, which resolves in FileEntry or 
          * error code, see 
          * http://docs.phonegap.com/en/3.0.0/cordova_file_file.md.html#FileError
          */
         this.getFile = function(pathToFile, options) {
            var deferred = $q.defer();
            getFileSystem().then(function(fileSystem) {
               fileSystem.root.getFile(
                  pathToFile,
                  options,
                  function(entry){
                     deferred.resolve(entry);
                  },
                  function(error) {
                     $log.warn('Error, getting file "' + pathToFile + '"');
                     deferred.reject(error);
                  }
               );
            }, function() {
               deferred.reject();
            });
            return deferred.promise;
         };
         
         this.getFileData = function(entry) {
            var deferred = $q.defer();
            function win(file) {
               var reader = new $window.FileReader();
               reader.onloadend = function(evt) {
                  deferred.resolve(evt.target.result);
               };
               
               reader.onerror = function(error) {
                  $log.error(error.name, error.message);
                  deferred.reject({error : error});
               };
               reader.readAsText(file);
            }
            function fail(evt) {
               $log.error(evt.code);
               deferred.reject(evt.code);
            }
            entry.file(win, fail);
            return deferred.promise;
         };
         
         this.getFileDataByPath = function(pathToFile) {
            var deferred = $q.defer();
            this.getFile(pathToFile).then(function(entry) {
               this.getFileData(entry).then(function(data) {
                  deferred.resolve(data);
               }, function(reason) {
                  deferred.reject(reason);
               });
            }.bind(this), function(error) {
               deferred.reject(error);
            });
            return deferred.promise;
         };
         
         this.getFileInfo = function(fileEntry) {
            var deferred = $q.defer();
            fileEntry.file(function(info) {
               deferred.resolve(info);
            }, function() {
               $log.error('Error, getting info from file ' +
                     fileEntry.fullPath);
               deferred.reject();
            });
            return deferred.promise;
         };
         
         /**
          * <summary>
          * Downloads file, specified in first parameter to path, specified
          * in second
          * </summary>
          * 
          * @param {string} fileUrl url, to download file from
          * @param {string} filePath path to save file
          */
         this.downloadFile = function(fileUrl, filePath) {
            var deferred = $q.defer();
            var uri = encodeURI(fileUrl);
            // Ensure FS structure before starting download
            
            getFileSystem().then(function(fileSystem) {
               if (angular.isUndefined(fileTransfer)) {
                  fileTransfer = new $window.FileTransfer();
               }
               $log.info('Starting download of "' + fileUrl + '" to "' +
                     filePath + '"');
               fileSystem.root.getFile(
                  filePath,
                  {create: true, exclusive: false},
                  function(fileEntry) {
                     $log.info('Starting download of "' + fileUrl + '" to "' +
                           fileEntry.fullPath + '"');
                     fileTransfer.download(
                           uri,
                           fileEntry.fullPath,
                           function(entry) {
                              $log.debug('Download complete: ' + entry.fullPath);
                              deferred.resolve(entry);
                           },
                           function(error) {
                              $log.error("Download error");
                              $log.error("Code: " + error.code);
                              $log.error("HTTP status: " + error.http_status);
                              $log.error("Source: " + error.source);
                              $log.error("Target: " + error.target);
                              deferred.reject(error.code);
                           },
                           
                           // trustAllHosts
                           // Optional parameter, defaults to false. 
                           // If set to true then it will accept all 
                           // security certificates. 
                           // This is useful as Android rejects self 
                           // signed security certificates. 
                           // Not recommended for production use. 
                           // Supported on Android and iOS. (boolean)
                           true
                     );
                  }, function(error) {
                     $log.error('Error, creating file "' + filePath + '"');
                     $log.error('Error code: ' + error.code);
                     deferred.reject(error.code);
                  });
            });
            return deferred.promise;
         };
         
         this.removeFileByPath = function(filePath) {
            var deferred = $q.defer();
            this.getFile(filePath).then(function(fileEntry) {
               this.removeFileByEntry(fileEntry).then(function(entry) {
                  deferred.resolve(entry);
               }, function(errorObj) {
                  deferred.reject(errorObj);
               });
            }.bind(this), function() {
               deferred.resolve();
            });
            return deferred.promise;
         };
         
         this.removeFileByEntry = function(fileEntry) {
            var deferred = $q.defer();
            fileEntry.remove(function(entry) {
               deferred.resolve(entry);
            }, function(error) {
               deferred.reject({error: error});
            });
            return deferred.promise;
         };
      }]
   });
});