/*jslint node: true */
(function () {
   'use strict';

   /* jslint camelcase:false */
   var config = require(__dirname + '/../../../utils/configReader.js');
   var nano = require('nano')(config.database_url);
   var q = require('q');
   var _ = require('underscore');
   var dbNamePrefix = [config.database_name, ''];
   if (config.environment_name) {
      dbNamePrefix.unshift(config.environment_name);
   }
   /* jslint camelcase:true */

   dbNamePrefix = dbNamePrefix.join('_').toLowerCase();
   var db = nano.use(dbNamePrefix + 'db');

   var logger = require(__dirname + '/../../../utils/logger.js').getLogger(__filename);
   var bulkSize = 100;

   var convertHelper = {
      'currentLanguage' : {
         'name'   : 'selectedLibraryLanguage',
         'group'  : 'LibraryFilteringSettings'
      },
      'category'  : {
         'name'   : 'selectedPublicationGroupName',
         'group'  : 'LibraryFilteringSettings'
      },

      'readModeSettings.fontSize': {
         'name'   : 'fontSize',
         'group'  : 'ReaderSettings'
      },
      'readModeSettings._font': {
         'name'   : 'fontName',
         'group'  : 'ReaderSettings'
      },
      'readModeSettings._theme': {
         'name'   : 'readingThemeName',
         'group'  : 'ReaderSettings'
      },
      'readModeSettings.lastUserCategory': {
         'name'   : 'materialCategoryName',
         'group'  : 'ReaderSettings'
      },
      'readModeSettings.marginNotesMode': {
         'name'   : 'expandedMarginNotes',
         'group'  : 'ReaderSettings'
      }
   };

   function _convertSetting(referenceData) {
      var settings = [];
      var userId = referenceData.userId;
      var type = 'setting';
      var setAt = new Date();

      Object.keys(convertHelper).forEach(function(key) {
         var value = key.split('.').reduce(function(memo, key) {
            var value = memo[key];
            return _.isUndefined(value) ? {} : value;
         }, referenceData);

         if (_.isUndefined(value) || _.isNull(value) || (_.isObject(value) && _.keys(value).length === 0)) {
            return;
         }

         settings.push({
            userId   : userId,
            type     : type,

            group    : convertHelper[key].group,
            name     : convertHelper[key].name,
            setAt    : setAt,
            value    : value
         });
      });

      return settings;
   }

   function _convertSettings(list) {
      var settings = [];

      list.forEach(function (el) {
         settings.push.apply(settings, _convertSetting(el.doc));
      });

      return settings;
   }

   function _convertReferenceForRemove(el) {
      var data = _.pick(el.doc, '_id', '_rev');
      data._deleted = true;
      return data;
   }

   function _convertReferencesForRemove(list) {
      return list.map(_convertReferenceForRemove);
   }

   function _bulk(rows) {
      var deferred = q.defer();
      var data = {
         docs : rows
      };
      db.bulk(data, function (err) {
         if (err) {
            logger.error(err);
            return deferred.reject();
         }

         deferred.resolve();
      });

      return deferred.promise;
   }

   function _walker() {
      var deferred = q.defer();

      /* jslint camelcase:false */
      var options = {
         include_docs   : true,
         limit          : bulkSize
      };
      /* jslint camelcase:true */

      db.view('Views', 'referencedataGetAll', options, function (err, body) {
         if (err) {
            logger.error(err);
            return deferred.resolve();
         }

         /* jslint camelcase:false */
         if (body.total_rows === 0) {
            /* jslint camelcase:true */
            logger.log('converter settings finished');
            return deferred.resolve();
         }

         var rows = body.rows.filter(function(el) {
            return el.id !== '_design/Views';
         });

         // bulk insert
         var step = _bulk(_convertSettings(rows));
         // bulk delete
         step.then(_bulk(_convertReferencesForRemove(rows)));
         // then next step
         step.then(_walker);

         step.then(function() {
            deferred.resolve();
         });
      });

      return deferred.promise;
   }

   function _get(id) {
      var deferred = q.defer();

      /* jslint camelcase:false */
      var opts = { revs_info: true };
      /* jslint camelcase:true */

      db.get(id, opts, function (err, body) {
         if (err) {
            return deferred.reject();
         }

         deferred.resolve(body);
      });

      return deferred.promise;
   }

   function _save(item) {
      var deferred = q.defer();

      db.insert(item, function(err, body) {
         if (err) {
            logger.error(err);
            return deferred.reject();
         }
         deferred.resolve(body);
      });

      return deferred.promise;
   }

   function _addTempView(item) {
      item.views.referencedataGetAll = { map : '(function(doc) { if(doc.type === \'referencedata\'){emit(null, doc);}})'};
      return item;
   }

   function _createViews() {
      return {
         _id      : '_design/Views',
         language : 'javascript',
         views    : {}
      };
   }

   function _cleanViews() {
      return _get('_design/Views').then(_markAsDeleted).then(_save);
   }

   function _markAsDeleted(obj) {
      obj._deleted = true;
      return obj;
   }

   function _addViewAndWalk(views) {
      var deferred = q.defer();
      deferred.resolve(_addTempView(views));
      return deferred.promise.then(_save).then(_walker);
   }

   module.exports = {
      init : function () {
         return _get('_design/Views').then(_addViewAndWalk, _onNewDB);

         function _onNewDB() {
            return _addViewAndWalk(_createViews()).then(_cleanViews);
         }
      }
   };
})();
