define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         '$q',
         'swPublicationsService',
         function ($q, swPublicationsService) {

            var _listeners = [];

            this.fetchDefaultCategories = function () {
               var data = {
                  remote : swPublicationsService.getFileListByType('remote'),
//                  local  : swPublicationsService.getFileListByType('local')
               };
               return $q.all(data).then(function (results) {
                  var catHash = {};
                  _.each(results.remote, function(item) {
                     var cat = item.category;
                     if (cat) {
                        cat = cat.toLowerCase();
                        catHash[cat.charAt(0).toUpperCase() + cat.slice(1)] = true;
                     }
                  });
                  return _.keys(catHash);
//                  var localBooks = _.values(results.local);
//                  var allBooks = _.union(localBooks, [results.remote]);
//                  _.each(allBooks, function (data) {
//                     _.each(data, function (item) {
//                        if (item.category) {
//                           _categories.push(item.category.toLowerCase());
//                        }
//                     });
//                  });
//
//                  _categories = _.map(_.uniq(_categories),
//                      function (category) {
//                         return category.charAt(0).toUpperCase() + category.slice(1);
//                      });
//
//                  return _categories;
               });
            };

            this.onCategoriesFieldChanged = function (value) {
               this.logger.debug('Language field changed: ', value);
               for (var i = 0; i < _listeners.length; ++i) {
                  _listeners[i].apply(null, [value]);
               }
            };

            this.addOnCategoriesFieldChangedListener = function (listener) {
               _listeners.push(listener);
            };

            this.removeOnCategoriesFieldChangedListener = function (listener) {
               for (var i = 0; i < _listeners.length; ++i) {
                  if (_listeners[i] === listener) {
                     _listeners.splice(i, 1);
                  }
               }
            };

         }]
   });
});