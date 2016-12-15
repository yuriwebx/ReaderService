define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$q', 'swRestService', 'swReaderService',
         'swApplicationToolbarService', 'swBookInfoService',
         function($q, swRestService, swReaderService,
            swApplicationToolbarService, swBookInfoService) {

            var annotationCategories = [{}];

            this.fetchMaterialsSet = function() {
               var deferred = $q.defer();
               var params = getRequestParams();

               //!!!swRestService.restRequest
               //debugger;//service provider - tested
               swRestService.restSwHttpRequest('get', 'Materials', 'fetch', params)
                  .then(function onMaterialsFetch(response) {
                     var materials = response.data;
                     annotationCategories = materials.categories;
                     deferred.resolve(materials);
                  }, deferred.reject);

               return deferred.promise;
            };

            this.updateMaterialsSet = function(materials, publication) {
               var params        = getRequestParams();
               params.materials  = materials;

               if (publication) {
                  params.bookId     = publication.id;
                  params.studyGuide = publication.type === 'StudyGuide';
               }

               //swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('post', 'Materials', 'update', params);
            };

            this.getExercises = function() {
               var deferred = $q.defer();
               var params = getRequestParams();
               swRestService.restRequest('get', 'Materials', 'exercises', params)
                  .then(function (response) {
                     deferred.resolve(response.data);
                  }, deferred.reject);

               return deferred.promise;
            };

            this.getAnnotationCategories = function() {
               return annotationCategories;
            };

            this.addCustomCategory = function() {
               return this.updateMaterialsSet({
                  categories : getCustom(annotationCategories)
               });
            };

            this.removeCustomCategory = function(category) {
               var deferred = $q.defer();
               annotationCategories =
                  annotationCategories.filter(function(cat) {
                     return category.name !== cat.name;
                  });

               this.addCustomCategory()
                  .then(function onCustomCategoryRemove() {
                     deferred.resolve(annotationCategories);
                  }, deferred.reject);

               return deferred.promise;
            };


            function getRequestParams() {
               var bookId     = swReaderService.getBookKey()._id;
               var studyGuide = false;
               var bookInfo   = {};

               if (bookId) {
                  bookInfo    = swBookInfoService.getBookInfo({_id: bookId});
                  studyGuide  = bookInfo && bookInfo.type === 'StudyGuide';
               }

               return {
                  bookId     : bookId,
                  editor     : swApplicationToolbarService.isEditor(),
                  studyGuide : studyGuide
               };
            }

            function getCustom(categories) {
               return categories.filter(function(category) {
                  return !category.preset;
               });
            }
         }
      ]
   });
});