define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         'swRestService',
         'swUserPublicationService',
         'swUserService',
         'swAgentService',
         function (
            swRestService,
            swUserPublicationService,
            swUserService,
            swAgentService) {
            var editCourseFn;
            this.persistStudyCourse = persistStudyCourse;
            this.getStudyCourse = getStudyCourse;
            this.calcBookRangeProperties = calcBookRangeProperties;
            this.editCourse = editCourse;
            this.setEditCourseFn = setEditCourseFn;
            this.persistStudyCourseAndUserPublication = persistStudyCourseAndUserPublication;

            function persistStudyCourse(studyCourse)
            {
               //swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('post', 'StudyCourses', {
                  studyCourse : studyCourse
               });
            }

            function getStudyCourse(id, collapseNestedCourses)
            {
               //swRestService.restRequest
               //debugger;//service provider - result is not used
               return swAgentService.request('get', 'StudyCourses', 'get', {
                  id : id,
                  collapseCourses : collapseNestedCourses
               });
            }

            function calcBookRangeProperties(bookId, paragraphRange)
            {
               //swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('get', 'StudyCourses', 'calcBookRangeProperties', {
                  bookId : bookId,
                  paragraphRange : paragraphRange
               });
            }

            function editCourse(courseId)
            {
               swUserPublicationService.updateUserPublication({
                  publicationId : courseId,
                  personal : true,
                  readingDuration : 0,
                  lastOpenedAt : _.now(),
                  publicationType : 'StudyCourse'
               });
               editCourseFn(courseId);
            }

            function setEditCourseFn(fn)
            {
               editCourseFn = fn;
            }

            function persistStudyCourseAndUserPublication() {
               persistStudyCourse({}).then(function(resp) {
                   editCourse(resp.data);
                   var user = swUserService.getUser();
                   swUserPublicationService.updateTitleLastRecentItem('New Course', user.firstName + ' ' + user.lastName);
               });
            }
         }]
   });
});