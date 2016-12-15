define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         'swLookupService',
         'swManageTestService',
         'swReaderService',
         'swManageTestsService',
         'swManageEssayTaskService',
         'swDiscussionsService',
         'swCopyService',
         'swReportService',
         function (
            swPopupService,
            swLookupService,
            swManageTestService,
            swReaderService,
            swManageTestsService,
            swManageEssayTaskService,
            swDiscussionsService,
            swCopyService,
            swReportService
         ) {

            var contextPopup,
                prevType,
                globalExtend,
                listenersMap = {};

            this.showPopup = function (extend, type, additionalData) {
               if ((globalExtend || extend) && (prevType !== type || !contextPopup || contextPopup.isHidden())) {
                  if (extend) {
                     globalExtend = extend;
                  }

                  var params = {
                     extendScope: globalExtend,
                     layout: globalExtend.extend.layout,
                     backdropEvents: !globalExtend.extend.isModal
                  };

                  var publicationId,
                      classId;

                  switch (type) {
                     case 'mark':
                        globalExtend.extend.isNewPopupOpen = false;
                        globalExtend.noteExtend = [{}];
                        globalExtend.noteExtend.type = type;
                        globalExtend.extend.closePopup(true);
                        globalExtend.callback(globalExtend.noteExtend);
                        break;
                     case 'note':
                     case 'comment':
                        if (globalExtend.extend.removeCopyHandler) {
                           globalExtend.extend.removeCopyHandler();
                        }
                        globalExtend.extend.isNewPopupOpen = !extend;
                        if (!additionalData || !additionalData.length) {
                           globalExtend.noteExtend = [{}];
                        }
                        else {
                           globalExtend.noteExtend = additionalData;
                        }
                        globalExtend.noteExtend.type = type;
                        params.customClass = 'context-note-popup ' + globalExtend.noteExtend.type + '-popup';
                        params.template = '<sw-context-note noteextenddata="noteExtend" extend="extend"></sw-context-note>';
                        params.requestFocus = false; // after discussion instead of   globalExtend.extend.isNewPopupOpen;
                        contextPopup = swPopupService.show(params);
                        break;
                     case 'lookup':
                        globalExtend.extend.isNewPopupOpen = true;
                        swLookupService.showLookupPopup(globalExtend.extend.lookupString || '', globalExtend.extend.layout, globalExtend.extend);
                        return;
                      case 'copy':
                         globalExtend.extend.isNewPopupOpen = false;
                         swCopyService.copyText(globalExtend.extend.copyText);
                         globalExtend.extend.closePopup(true);
                         break;
                     case 'flashcard':
                     case 'quiz':
                        if (globalExtend.extend.removeCopyHandler) {
                           globalExtend.extend.removeCopyHandler();
                        }
                        globalExtend.extend.isNewPopupOpen = true;
                        var testData = _.isArray(additionalData) ? {testType: (type === 'flashcard' ? 'Flashcard' : 'Quiz')} : additionalData;

                        publicationId = swReaderService.getBookKey()._id;

                        testData.locator = globalExtend.extend.locator;

                        if (testData._id)
                        {
                           //debugger;//service client - NOT TESTED
                           swManageTestsService.getTest(testData._id)
                              .then(function(data) {
                                 contextPopup = swManageTestService.showTestEditor(data, publicationId);
                                 setPopupPromise(contextPopup);
                              });
                           return;
                        }
                        else
                        {
                           contextPopup = swManageTestService.showTestEditor(testData, publicationId);
                        }

                        break;
                     case 'essay':
                        if (globalExtend.extend.removeCopyHandler) {
                           globalExtend.extend.removeCopyHandler();
                        }
                        var essayTaskData;
                        var paragraphId = globalExtend.extend.locator;

                        publicationId = swReaderService.getBookKey()._id;
                        globalExtend.extend.isNewPopupOpen = true;
                        if (additionalData && additionalData._id){
                           essayTaskData = {
                              _id: additionalData._id,
                              comment: additionalData.comment,
                              locator: additionalData.locator,
                              topic: additionalData.topic,
                              wordsLimit: additionalData.wordsLimit,
                              publicationId: additionalData.publicationId,
                              modifiedAt: additionalData.modifiedAt,
                              createdAt: additionalData.createdAt
                           };
                        }
                        contextPopup = swManageEssayTaskService.showEssayEditor(paragraphId, publicationId, essayTaskData);

                        break;
                     case 'share':
                        if (globalExtend.extend.removeCopyHandler) {
                           globalExtend.extend.removeCopyHandler();
                        }

                        globalExtend.extend.isNewPopupOpen = true;
                        params.template = '<sw-context-share extend="extend"></sw-context-share>';
                        params.customClass = 'defaultPopup';
                        contextPopup = swPopupService.show(params);
                        break;
                     case 'discussion':
                        globalExtend.extend.isNewPopupOpen = true;
                        publicationId = swReaderService.getBookKey()._id;
                        paragraphId = globalExtend.extend.locator;
                        classId = globalExtend.extend.classId;
                        var action = globalExtend.extend.action;

                        if (globalExtend.extend.removeCopyHandler) {
                           globalExtend.extend.removeCopyHandler();
                        }

                        var discussionData = {};

                        if (additionalData._id) {
                           var discussion = swDiscussionsService.getDiscussion(additionalData._id, classId);
                           if (classId) {
                              discussion.then(function (discussionTask) {
                                 contextPopup = swDiscussionsService.showDiscussionPopup(discussionTask, action);
                                 setPopupPromise(contextPopup);
                              });
                           }
                           else {
                              contextPopup = swDiscussionsService.showDiscussionPopup(additionalData, action);
                              setPopupPromise(contextPopup);
                           }
                           return;
                        }
                        else {
                           if (classId) {
                              discussionData = {
                                 classId : classId,
                                 bookId  : publicationId,
                                 userRole : globalExtend.extend.isTeacher ? 'Teacher' : 'Student'
                           };
                           }
                           discussionData.locator = paragraphId;
                           contextPopup = swDiscussionsService.showDiscussionPopup(discussionData, action);
                        }
                        break;
                     case 'audio':
                        globalExtend.extend.isNewPopupOpen = false;
                        var audioData = [{}];
                        audioData.type = type;
                        globalExtend.callback(audioData);
                        globalExtend.extend.closePopup(true);
                        break;
                     case 'reset-reading':
                        globalExtend.extend.isNewPopupOpen = false;
                        globalExtend.callback({type:type, locator:globalExtend.extend.locator});
                        globalExtend.extend.closePopup(true);
                        break;
                     case 'report':
                        globalExtend.extend.isNewPopupOpen = true;
                        var info = {
                           id: globalExtend.extend.publicationId,
                           author: globalExtend.extend.publicationAuthor,
                           title: globalExtend.extend.publicationName,
                           selection: globalExtend.location
                        };
                        contextPopup = swReportService.showPopup(params.layout, info);
                        break;
                     default :
                        params.customClass = 'context-popup' + (globalExtend.extend.isEditor ? ' context-popup-editor' : '');
                        params.template = '<sw-context extend="extend"></sw-context>';
                        var layout = params.layout();
                        _.assign(layout, {collision: {flipHor:  false}});
                        params.layout = layout;
                        contextPopup = swPopupService.show(params);
                  }


                  prevType = type;

                  globalExtend.extend.updateLayout = contextPopup.layout;
                  globalExtend.extend.closePopup = contextPopup.hide;

                  setPopupPromise(contextPopup);

               }

               function setPopupPromise(popup) {
                  if ( !popup ) {
                     return false;
                  }
                  popup.promise.then(function () {
                     if (arguments[0] && (type === 'flashcard' || type === 'quiz' || type === 'essay' || type === 'discussion')) {
                        if ( typeof globalExtend.extend.popupClose === 'function' ) {
                           globalExtend.extend.popupClose();
                        }
                        var data = [arguments[0]];
                        data.type = type;
                        globalExtend.callback(data);
                        return;
                     }

                     if (!globalExtend.extend.isNewPopupOpen) {
                        globalExtend.extend.clearUpdateLayout();
                        globalExtend.extend.popupClose();
                        if (globalExtend.noteExtend &&
                              (globalExtend.noteExtend.type === 'note' ||
                               globalExtend.noteExtend.type === 'comment')

                        ) {
                           globalExtend.callback(globalExtend.noteExtend);
                        }
                     }
                     globalExtend.extend.isNewPopupOpen = false;
                  });
               }
            };

            this.updateLayout = function () {
               if (globalExtend && globalExtend.extend && typeof globalExtend.extend.updateLayout === 'function') {
                  globalExtend.extend.updateLayout();
               }
            };

            this.addExerciseChangeListeners = function (_listeners) {
               _.extend(listenersMap, _listeners);
            };

            this.updateExercise = function (data) {
               if (typeof listenersMap[data.type] === 'function') {
                  listenersMap[data.type](data);
               }
            };

         }]
   });
});