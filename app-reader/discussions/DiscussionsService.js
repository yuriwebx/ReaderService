define([
   'module',
   'angular',
   'swServiceFactory',
   'text!./managediscussion/ManageDiscussion-header.html',
   'text!./participateindiscussion/ParticipateInDiscussion-header.html'
], function (module, angular, swServiceFactory, headerManage, headerParticipateIn) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swPopupService',
         '$rootScope',
         'swManageDiscussionTasksService',
         'swManageClassDiscussionsService',
         function (
            swPopupService,
            $rootScope,
            swManageDiscussionTasksService,
            swManageClassDiscussionsService) {
            var popup;
            var $scope = $rootScope.$new();
            var _this = this;

            this.showDiscussionPopup = showDiscussionPopup;
            this.getDiscussion       = getDiscussion;
            this.close               = close;

            function showDiscussionPopup (_discussionData, _action) {
               if ( !_action ) {
                  return null;
               }

               _action = _action.toLowerCase();
               if ( _action === 'edit' ) {
                  return _manageDiscussion(_discussionData);
               }
               else if ( _action === 'participate' ) {
                  return _participateInDiscussion(_discussionData);
               }
               else {
                  return null;
               }
            }

            function _manageDiscussion (_discussionData) {
               var _params = {
                  data          : _discussionData,
                  className     : 'manage-discussion-popup',
                  header        : headerManage,
                  componentName : 'manage-discussion'
               };
               return _showPopup(_params);
            }

            function _participateInDiscussion (_discussionData) {
               var targetEl = angular.element('.sw-appToolbar-wrapper') || [];
                   targetEl = targetEl[0];

               var _params = {
                  data          : _discussionData,
                  className     : 'participate-in-discussion-popup',
                  header        : headerParticipateIn,
                  componentName : 'participate-in-discussion'
               };
               return _showPopup(_params, targetEl);
            }

            function _showPopup (_params, _targetEl) {
               if ( !popup || popup.isHidden() ) {
                  $scope.swScrollOptions = { type: 'NONE' };
                  $scope.headerFn = {
                     closePopup : _this.close,
                     persistFn  : function(){}
                  };

                  $scope.discussionData = _params.data || {};
                  var params = {
                     layout          : {},
                     backdropVisible : true,
                     modal           : true,
                     customClass     : _params.className,
                     scope           : $scope,
                     header          : _params.header,
                     content         : '<sw-' + _params.componentName + 
                                       ' header-fn="headerFn" discussion-data="discussionData" update-popup-layout="updatePopupLayout()"></sw-' + _params.componentName + '>'
                  };

                  if ( _targetEl ) {
                     var clientRect = _targetEl.getClientRects()[0];
                     params.layout = {
                        margin: {
                           top: 20
                        },
                        of : {
                           clientRect: clientRect
                        }
                     };
                  }
                  popup = swPopupService.show(params);
                  $scope.updatePopupLayout = popup.layout;
                  return popup;
               }
            }

            function getDiscussion (discussionId, classId) {
               return classId ? swManageClassDiscussionsService.getClassDiscussion(discussionId, classId) :
                  swManageDiscussionTasksService.getDiscussionTask(discussionId);
            }

            function close (data) {
               popup.hide(data || false);
            }
         }]
   });
});