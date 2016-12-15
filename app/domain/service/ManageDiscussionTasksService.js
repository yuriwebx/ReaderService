define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['$q', 'swContentProvider',
         function ($q, swContentProvider)
         {
            var taskType = 'discussionTasks',
                date = new Date().getTime();

            this.getDiscussionTask = function getDiscussionTask (discussionTaskId) {
               return swContentProvider.getExercise(discussionTaskId);
            };

            this.persistDiscussionTask = function persistDiscussionTask (discussionTask) {
               var isNew = !swContentProvider.getExercise(discussionTask._id);

               discussionTask.createdAt = discussionTask.createdAt || date;
               discussionTask.modifiedAt = date;

               swContentProvider.onMaterialsChange(taskType, discussionTask, isNew ? 'add' : 'update');
               return $q.when(true);
            };

            this.removeDiscussionTask = function removeDiscussionTask (discussionTaskId) {
               var discussionTask = this.getDiscussionTask(discussionTaskId);
               if (!discussionTask) {
                  return false;
               }
               discussionTask.remove = true;
               swContentProvider.onMaterialsChange(taskType, discussionTask, 'remove');
            };
         }
      ]
   });
});