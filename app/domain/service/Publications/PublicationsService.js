/* global Blob: false */

define([
   'unidecode',
   'underscore',
   'xregexp',
   'angular',
   'module',
   'swServiceFactory',
   'swLoggerFactory',
   'Context',
   'HashGenerator',
   'swAppUrl',
   './utils'
], function (unidecode, _, XRegExp, angular, module, swServiceFactory, swLoggerFactory,
  Context, HashGenerator, swAppUrl, utils) {
   'use strict';
   var logger = swLoggerFactory.getLogger(module.id);
   swServiceFactory.create({
      module : module,
      service : ['$q', 'swResourcesAccessService', '$timeout', 'swRestService', 'swOfflineModeService',
      'swLongRunningOperation', 'swAgentService', 'swDownloadManager',
         function ($q, swResourcesAccessService, $timeout, swRestService, swOfflineModeService,
            swLongRunningOperation, swAgentService, swDownloadManager) {
            var dbWrapper = swResourcesAccessService.getLocalRepositoryConnection();
            var filesHandling = swResourcesAccessService.getLocalFileSystemConnection();
            var bookIdStr = '_id';
            var defaultStructure = {};
            var cachedFileStructure = false;
            var localPublications = {};
            var checkLocalPublicationsLastRequest = 0;
            var hash = HashGenerator.CRC32(swAppUrl.directory);

            var cachedFileStructureTime = 0;
            var cacheTimeOut = 30 * 1000;
            var cachedPromise = false; // 30 second

            filesHandling.setNamespacePrefix(hash);
            dbWrapper.setDBPrefix(hash);

            function propertyDataFilter (item) {
               return item.data;
            }

            this.persistDefaultStudyGuide = persistDefaultStudyGuideForBook;
            this.persistCurrentStudyGuide = persistCurrentStudyGuideForBook;
            this.getBookInfo              = getBookInfo;
            this.getCollectionInfo        = getCollectionInfo;
            this.getStudyGuideInfo        = getStudyGuideInfo;

            this.checkLocalPublications   = checkLocalPublications;
            this.getFileListByType        = getFileListByType;
            this.initPublicationPresentation = initPublicationPresentation;
            this.loadFilePartial          = loadFilePartial;
            this.loadFile                 = loadFile;
            this.isPublicationAtMyBooks   = isPublicationAtMyBooks;
            this.isPublicationLocalStored = isPublicationLocalStored;
            this.initFS                   = filesHandling.initFS;
            this.isFSAvailable            = filesHandling.isFSAvailable;

            this.searchPublications       = searchPublications;
            this.searchCollectionItems    = searchCollectionItems;
            this.getRelatedPublications   = getRelatedPublications;
            this.getPublicationDetails    = getPublicationDetails;
            this.getPublicationDetailsByExtId = getPublicationDetailsByExtId;
            this.getLocalPublicationDetails = getLocalPublicationDetails;
            this.searchBooks              = searchBooks;
            this.saveStudyGuide           = saveStudyGuide;
            this.refreshMyPublications    = refreshMyPublications;

            this.setRecentBook            = setRecentBook;
            this.getRecentBook            = getRecentBook;
            this.getAllBooks              = getAllBooks;
            this.externalLink             = externalLink;
            this.isAuthorInBookTitle      = isAuthorInBookTitle;
            this.getCoverPath             = getCoverPath;
            this.showDifficulty           = _.get(Context.parameters, 'showDifficulty', true);

            function persistDefaultStudyGuideForBook ( _bookId, _defaultStudyGuideId ) {
               var reqData = {
                  bookId              : _bookId,
                  defaultStudyGuideId : _defaultStudyGuideId
               };
               return swAgentService.request('post', 'Publications', 'persistDefaultStudyGuide', reqData);
            }

            function persistCurrentStudyGuideForBook ( _bookId, _currentStudyGuideId ) {
               var reqData = {
                  bookId              : _bookId,
                  currentStudyGuideId : _currentStudyGuideId
               };
               return swAgentService.request('post', 'Publications', 'persistCurrentStudyGuide', reqData);
            }

            function getBookInfo(_bookId) {
               var reqData = {
                  id : _bookId
               };
               var promise = swAgentService.request('get', 'Publications', 'getBookInfo', reqData);
                  if (isPublicationLocalStored(_bookId)) {
                     return dbWrapper.get(_bookId).then(function (book) {
                     return promise
                         .catch(function(){
                        return {
                           data : {
                              relatedStudyGuides : []
                           }
                        };
                         })
                         .then(function(res) {
                           book.publicationType = book.type;

                           res.data.book = res.data.book || book;

                           res.data.tableOfContents = book.tableOfContents || res.data.tableOfContents;
                           res.data.id = book._id;
                           return res;
                     });
                  });
                  }
               else {
                  return promise;
               }
            }

            function getStudyGuideInfo (_studyGuideId) {
               var reqData = {
                  id : _studyGuideId
               };
               return swAgentService.request('get', 'Publications', 'getStudyGuideInfo', reqData);
            }

            function getCollectionInfo (_collectionId) {
               var reqData = {
                  id : _collectionId
               };
               return swAgentService.request('get', 'Publications', 'getCollectionInfo', reqData);
            }

            function checkLocalPublications () {
               var curtime = (new Date()).getTime();
               if (curtime - checkLocalPublicationsLastRequest > 1000 * 60) {
                  getLocalPublicationsData();
                  checkLocalPublicationsLastRequest = curtime;
               }
            }

            function getCoverPath (publication, size, fallback, useServerUrl) {
               if ('string' === typeof publication || !publication) { // simply the path to
                 return publication;
               }
               var path = fallback;
               var id = publication.bookId || publication.id || publication._id;
               size = _.get(Context.parameters.thumbsPathes, size, ''); // (?)
               if (publication.cover && id) {
                  path = swDownloadManager.get(id).getCoverPath(size, publication.cover, useServerUrl);
               }
               return path;
            }

            function initPublicationPresentation (publicationId, classId, isEditor, readRange) {
              var swLongRunningOperationEnd = _.noop;
              var requestParams = {
                publicationId : publicationId,
                classId : classId,
                editor : isEditor,
                range : readRange
              };
              var _getDetails = _.noop;

              if (swOfflineModeService.isOfflineModeEnabled()) {
                _getDetails = _getDetailsFromAgent;
              }
              else if (swOfflineModeService.isOffline()) {
                _getDetails = _getDetailsFromLocal;
              }
              else {
                _getDetails = _getDetailsFromRemote;
              }

              return _getDetails(requestParams)
                .then(function (publicationPresentation) {
                  var details = publicationPresentation.details.book;
                  var item = swDownloadManager.get(details.id);
                  var skipDownload = isEditor || !filesHandling.isFSAvailable() || !item.content.outdated;
                  swLongRunningOperationEnd = swLongRunningOperation.start('downloadBook');

                  return (skipDownload ? item.udpateInfo(details) : item.downloadBook())
                    .then(function () {
                      return loadContentFiles(item);
                    })
                    .then(function (response) {
                      var contentIndex = JSON.parse(response[0]);
                      return utils.parseContent(contentIndex, response[1], publicationPresentation);
                    })
                    .then(function () {
                      if (isEditor || !details.audio) {
                        return false;
                      }
                      return loadAudioFiles(item);
                    })
                    .then(function (response) {
                      if (!response) {
                        return publicationPresentation;
                      }
                      publicationPresentation.audio.diff = JSON.parse(response[0]);
                      return utils.parseAudioIndex(response[1], publicationPresentation);
                    });
                })
                .catch(function (err) {
                  logger.error(err);
                  return $q.reject(err);
                })
                .finally(function () {
                  swLongRunningOperationEnd();
                });
            }

            function _getDetailsFromRemote (requestParams) {
              return swRestService.restSwHttpRequest('get', 'ContentProvider', 'init',
                _.extend(requestParams, {isDownloaded : true}))
                  .then(function (response) {
                    if (!response.data || !response.data.details) {
                      return $q.reject('Received an invalid response from the server');
                    }
                    if (response.data.materials) {
                      response.data.materials.categories = utils.defaultCategories
                        .concat(response.data.materials.categories || []);
                    }
                    return response.data;
                  });
            }

            function _getDetailsFromLocal (requestParams) {
              var result = new utils.PublicationPresentation();

              return dbWrapper.get(requestParams.publicationId)
              .then(preparePublicationInfo)
              .then(function (publicationInfo) {
                 result.details.book = publicationInfo;
                 result.details.id = publicationInfo.id;
                 return result;
              });
            }

            function _getDetailsFromAgent (requestParams) {
              var result = new utils.PublicationPresentation();
              var classId = requestParams.classId;
              var publicationId = requestParams.publicationId;

              var annotations = swAgentService.request('get', 'Materials', 'annotations', {publicationId:publicationId, classId: classId}, null, 'noop'); // not from backend
              var categories = swAgentService.request('get', 'Materials', 'categories', {publicationId:publicationId, classId: classId}, null, 'noop');
              var publication = swAgentService.request('get', 'Publications', 'details', {id: publicationId})
                  .catch(function() {
                     return {data: {}};
                  });

              var discussions = classId ? swAgentService.request('get', 'Discussion', 'searchClassDiscussions', {classId: classId}) : [];

              return swAgentService.tools.Promise.all([result, annotations, categories, getPubDetails(publicationId), publication, discussions])
                  .then(function(data){
                     var publicationData = data[0];
                     var info = data[3];
                     var pub = data[4].data;
                     var annotations = (data[1].data || [])
                         .concat(pub.notes || []);
                     var categories  = (utils.defaultCategories)
                         .concat(data[2].data || [])
                         .concat(pub.tags || []);

                     publicationData.details = info;

                     publicationData.materials.annotations = annotations;
                     publicationData.materials.categories = categories;
                     publicationData.materials.bookmarks = pub.bookmarks || [];
                     publicationData.materials.comments = pub.comments || [];

                     if (classId) {
                        publicationData.materials.classDiscussions = data[5].data || [];
                        publicationData.materials.paraSize = pub.paraSize || '';
                        publicationData.materials.essayTask = pub.essayTask || [];
                        publicationData.materials.test = pub.test || [];
                     }

                     return publicationData;
                  });
            }

            function getPubDetails(publicationId) {
               return swAgentService.request('get', 'Publications', 'details', {id: publicationId})
                   .then(function(res) {
                      var publication = res.data;
                      var publicationSummary = {};
                      if (publication.type === 'StudyGuide') {
                         publicationSummary = getStudyGuideInfo(publicationId);
                         //sourceId = publication.bookId;
                      }
                      else if (publication.collection) {
                         publicationSummary = getCollectionInfo(publication.collection);
                      }
                      else {
                         publicationSummary = getBookInfo(publicationId);
                      }
                      return publicationSummary;
                   })
                   .then(function(res) {
                      var publicationSummary = res.data;
                      var itemIndex  = -1;
                      var prevItemId = 0;
                      var nextItemId = 0;
                      if (isCollection(publicationSummary)) {
                         for (var i = 0, len = publicationSummary.books.length; i < len; i++) {
                            if (publicationSummary.books[i].id === publicationId) {
                               itemIndex = i;
                               break;
                            }
                         }
                         if (itemIndex) {
                            prevItemId = publicationSummary.books[itemIndex - 1].id;
                         }
                         if (itemIndex < publicationSummary.books.length - 1) {
                            nextItemId = publicationSummary.books[itemIndex + 1].id;
                         }

                         return getBookInfo(publicationId)
                             .then(function (res) {
                                var bookSummary = res.data;
                                if (prevItemId) {
                                    bookSummary.book.prevItemId = prevItemId;
                                }
                                if (nextItemId) {
                                    bookSummary.book.nextItemId = nextItemId;
                                }

                                return bookSummary;
                             });
                      }
                      else {
                         return publicationSummary;
                      }
                   });
            }

            function isCollection(publicationSummary) {
               return _.has(publicationSummary, 'books');
            }

            function loadContentFiles (item) {
              if (item.isDownloaded) {
                return $q.all([
                  loadFile(item.contenIndexPath, 'local'),
                  loadFilePartial(item.contentSourcePath, 'local', 0, -1)
                ]);
              }
              else {
                return $q.all([
                  swDownloadManager.getStaticResource(item.contenIndexPath, 'text'),
                  swDownloadManager.getStaticResource(item.contentSourcePath, 'arraybuffer')
                ]);
              }
            }

            function loadAudioFiles (item) {
              if (item.isAudioDownloaded) {
                return $q.all([
                  loadFile(item.audioIndexDiffPath, 'local'),
                  loadFilePartial(item.audioIndexPath, 'local', 0, -1)
                ]);
              }
              else {
               return $q.all([
                  swDownloadManager.getStaticResource(item.audioIndexDiffPath, 'text'),
                  swDownloadManager.getStaticResource(item.audioIndexPath, 'arraybuffer')
               ])
               .catch(function (err) {
                  logger.error(err);
                  return false;
               });
              }
            }

            function loadFilePartial (path, type, offset, size) {
               var deferred = $q.defer();

               if ('local' === type.toLowerCase()) {
                  filesHandling.loadFilePartial(path, offset, size, deferred.resolve, function (err) {
                     logger.error(err);
                     deferred.resolve(new Blob([], {type : 'text/html'}));
                  });
               }
               return deferred.promise;
            }

            function loadFile (path, type) {
               var deferred = $q.defer();

               if ('local' === type.toLowerCase()) {
                  filesHandling.loadFile(path, deferred.resolve, function (err) {
                     logger.error(err);
                     deferred.resolve(new Blob([], {type : 'text/html'}));
                  });
               }
               return deferred.promise;
            }

            function isPublicationAtMyBooks (id) {
               return localPublications.hasOwnProperty(id);
            }

            function isPublicationLocalStored (id) {
               return _.has(localPublications, id) && localPublications[id].content === 'local';
            }

            function searchPublications (filter, itemsCount, language, contentType, categories, personalPublications) {
               var requestData = {
                  filter      : filter,
                  itemsCount  : itemsCount,
                  language    : language,
                  contentType : contentType,
                  categories  : categories,
                  personalPublications : personalPublications
               };

               var requestParams = {
                  swBlockUserInput: false
               };

               return swAgentService.request('get', 'Publications', 'search', requestData, requestParams)
                  .then(function(response) {
                     return response.data.data;
                  });
            }

            swOfflineModeService.addRestProcessor('/rest/publications/search', function (config) {
               // TODO add query processing
               var conf = JSON.parse(JSON.stringify(config));
               return getLocalFileList().then(function (response) {
                  conf.data = {
                     data : _.map(_.filter(response, function (item) {
                        var result = true;
                        if (config.params.language && config.params.language !== item.language) {
                           result = false;
                        }
                        if (result && config.params.categories && config.params.categories !== item.category) {
                           result = false;
                        }
                        if (result && config.params.filter && -1 === (item.author + ' ' + item.name).toLowerCase().indexOf(config.params.filter.toLowerCase())) {
                           result = false;
                        }
                        return result;
                     }), function (item) {
                        item.id = item._id;
                        item.readingProgress = 0;
                        item.readingDuration = 0;
                        item.personal = true;
                        return _.omit(item, ['_id', '_rev']);
                     })
                  };
                  return conf;
               });
            });

            function searchCollectionItems (collectionId, personalPublications) {
               var requestParams = {
                  collectionId : collectionId,
                  personalPublications: personalPublications
               };
               return swAgentService.request('get', 'Publications', 'search', requestParams)
                  .then(function(response) {
                     return response.data.data;
                  });
            }

            function getRelatedPublications (publicationId, includeThisPublication, isStudyGuide) {
               //swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('get', 'Publications', 'getRelatedPublications', {
                  publicationId  : publicationId,
                  isStudyGuide   : isStudyGuide,
                  includeThisPublication : includeThisPublication
               });
            }

            function getPublicationDetails (id, type) {
               if (type.toLowerCase() === 'remote') {
                  //!!!swRestService.restRequest
                  //debugger;//service provider - tested
                  return swAgentService.request('get', 'Publications', 'details', {id : id}).then(propertyDataFilter);
               }
               else {
                  return getLocalPublications(id, 'fileName', []);
               }
            }

            function getPublicationDetailsByExtId (extId) {
               return swRestService.restSwHttpRequest('get', 'Publications', 'details', {externalId : extId}).then(propertyDataFilter);
            }

            function getLocalPublicationDetails (id) {
               return _.findWhere(cachedFileStructure, {_id: id});
            }

            function searchBooks (bookName, category, type) {
               if (type.toLowerCase() === 'remote') {
                  var data = {
                     bookName : bookName,
                     category : category
                  };
                  //!!!swRestService.restRequest
                  //debugger;//service provider - NOT TESTED
                  return swRestService.restSwHttpRequest('get', 'Publications', 'books', data).then(propertyDataFilter);
               }
               else {
                  return getLocalPublications(bookName, 'originalFileName', category);
               }
            }

            function saveStudyGuide (data, type) {
               if (type.toLowerCase() === 'remote') {
                  //swRestService.restRequest
                  //debugger;//service provider - result is not used
                  return swRestService.restSwHttpRequest('get', 'Publications', 'savestudyguide', {publicationData : JSON.stringify(data)});
               }
            }

            function refreshMyPublications() {
               getLocalFileList().then(getLocalPublicationsData);
            }

            function getRemoteFileList() {
               if (cachedPromise !== false) {
                  return cachedPromise;
               }
               var deferred = $q.defer();
               var useCache = (new Date()).getTime() <= (cachedFileStructureTime + cacheTimeOut);

               if (useCache && cachedFileStructure) {
                  $timeout(function () {
                     deferred.resolve(cachedFileStructure);
                  });
               }
               else {
                  cachedPromise = deferred.promise;
                  //!!!swRestService.restRequest
                  //debugger;//service provider - tested
                  swRestService.restSwHttpRequest('get', 'Publications', 'info', {}).then(
                        function (response) {
                           cachedFileStructureTime = (new Date()).getTime();
                           var result = response.data || getDefaultStructure();
                           if ('string' === typeof result) {
                              try {
                                 result = JSON.parse(result);
                              }
                              catch (e) {
                                 result = getDefaultStructure();
                              }
                           }
                           if (result && result.hasOwnProperty('dirName') && result.dirName === "") {
                              result = getDefaultStructure();
                           }
                           cachedFileStructure = result;
                           cachedPromise = false;
                           deferred.resolve(result);
                        }, function () {
                           cachedPromise = false;
                           deferred.resolve(getDefaultStructure());
                        }
                  );
               }
               return deferred.promise;
            }

            function getLocalFileList() {
               return dbWrapper.getAll().then(_onSuccessFileListLoading, _onFailedFileListLoading);

               function _onSuccessFileListLoading(data) {
                  data.forEach(function(item) {
                     localPublications[item[bookIdStr]] = {
                        content : item.isLocal ? 'local' : 'remote'
                     };
                  });
                  return data;
               }

               function _onFailedFileListLoading(err) {
                  logger.error(err);
                  return getDefaultStructure();
               }
            }

            function getFileListByType(type) {
               if (type.toLowerCase() === 'remote') {
                  return getRemoteFileList();
               }
               else {
                  return getLocalFileList();
               }
            }

            function getDefaultStructure() {
               return angular.copy(defaultStructure);
            }

            function getLocalPublications(param, fild, category) {
               return getLocalFileList().then(function _onPublicationLoad(local) {
                  return local.filter(_predicate);
               });

               function _predicate(item) {
                  var find = new RegExp(('^' + param), 'gi');
                  return find.test(item[fild]) && (category.indexOf(item.type) !== -1 || category.length === 0);
               }
            }

            function updateLocalPublications (data) {
               if (!Array.isArray(data)) {
                  data = [];
               }
               var sub = {}, sup = [];
               var i;
               for (i = 0; i < data.length; i++) {
                  if (!localPublications.hasOwnProperty(data[i])) {
                     sup.push(data[i]);
                  }
                  sub[data[i]] = 1;
               }
               for (i in localPublications) {
                  if (localPublications.hasOwnProperty(i) && !sub.hasOwnProperty(i)) {
                     delete localPublications[i];
                     dbWrapper.remove(i);
               }
               }
               if (sup.length) {
                  getRemoteFileList().then(function (res) {
                     var book;
                     for (var i = 0; i < res.length; i++) {
                        if (sup.indexOf(res[i][bookIdStr]) > -1) {
                           book = res[i];
                           book.isLocal = false;
                           book.lang = res[i].language;
                           localPublications[res[i][bookIdStr]] = localPublications[res[i][bookIdStr]] || {};
                           localPublications[res[i][bookIdStr]] = 'remote';
                           dbWrapper.set(res[i][bookIdStr], book);
                        }
                     }
                  });
               }
            }

            function getLocalPublicationsData () {
                  //swRestService.restRequest
               //debugger;//service provider - tested
               swRestService.restSwHttpRequest('get', 'MyPublications', {}).then(function (response) {
                  if (response.data !== 'error') {
                     updateLocalPublications(response.data);
               }
               });
            }

            function preparePublicationInfo (publicationInfo) {
               publicationInfo.wordsNumber = publicationInfo.wordsCount;
               publicationInfo.id = publicationInfo._id;
               return _.omit(publicationInfo, ['wordsCount', '_id', '_rev']);
            }

            //RecentBook

            //no clients
            function setRecentBook (book, info) {
               var data = {
                  publicationId : book._id,
                  info : info
               };
               //!!!swRestService.restRequest
               //debugger;//service provider - NOT TESTED
               return swRestService.restSwHttpRequest('post', 'RecentBook', 'update', data).then(propertyDataFilter);
            }

            var getRecentBookLastRequest = 0;
            function getRecentBook (isForce) {
               var curtime = (new Date()).getDate();
               if (isForce || (curtime - getRecentBookLastRequest > 1000 * 60)) {
                  getRecentBookLastRequest = curtime;
                  return fetchRecentBook();
               }
               else {
                  var deferred = $q.defer();
                  deferred.resolve([]);
                  return deferred.promise;
               }
            }

            function fetchRecentBook() {
               //!!!swRestService.restRequest
               //debugger;//service provider - tested
               return swRestService.restSwHttpRequest('get', 'RecentBook', {}).then(propertyDataFilter);
            }

            function getAllBooks () {
               return swRestService.restSwHttpRequest('get', 'Publications', 'allbooksinlibrary', {});
            }

            function externalLink (searchData, paragraphId) {
               var url = Context.applicationUrl + '#/reader';

               // TODO
               if ( _.has(searchData, '_extid') ) {
                  url += '/_extid/' + searchData._extid;
               }
               else {
                  url += '/_id/' + searchData._id;
               }

               paragraphId = paragraphId || searchData.paragraphId;
               if ( paragraphId ) {
                  url += '/_locator/' + paragraphId;
               }

               return url;
            }

            function isAuthorInBookTitle (author, title) {
               var signsRe = new XRegExp('\\P{Latin}+', 'g');
               var result = false;

               if (title) {
                  title = unidecode(title).replace(signsRe, '').toLowerCase();
                  author = unidecode(author).replace(signsRe, '').toLowerCase();
                  result = title.indexOf(author) !== -1 && title.length !== 0 && author.length !== 0;
               }
               return result;
            }

         }]
   });
});
