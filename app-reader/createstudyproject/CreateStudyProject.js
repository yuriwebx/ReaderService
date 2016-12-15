define([
   'module',
   'moment',
   'underscore',
   'swComponentFactory',
   'text!./CreateStudyProject.html',
   'less!./CreateStudyProject.less'
], function (module, moment, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      isolatedScope: {
         headerfn    : '=',
         publication : '=',
         footer      : '='
      },
      controller: [
         '$scope',
         'swCreateStudyProjectService',
         'swStudyClassService',
         'swValidationService',
         'swDateService',
         'swUtil',
         'swI18nService',
         'swPublicationsService',
         function (
            $scope,
            swCreateStudyProjectService,
            swStudyClassService,
            swValidationService,
            swDateService,
            swUtil,
            swI18nService,
            swPublicationsService) {

            var vm = $scope;
            var activeStepIndex  = 0,
                debValid = _.debounce(setControlsState, 100);

            vm.steps = [
               {
                  name  : 'Step1',
                  title : swI18nService.getResource('CreateStudyProject.wizard.step1.title')
               },
               {
                  name  : 'Step2',
                  title : swI18nService.getResource('CreateStudyProject.wizard.step2.title')
               },
               {
                  name  : 'Step3',
                  title : swI18nService.getResource('CreateStudyProject.wizard.step3.title')
               }
            ];

            vm.swSubmachine.configure({
               'Step1': {
                  uri: 'step1',
                  history: false
               },
               'Step2': {
                  uri: 'step2',
                  history: false
               },
               'Step3': {
                  uri: 'step3',
                  history: false
               }
            });

            vm.wizardApi = {
               getObjectsItemValue : getObjectsItemValue,
               validateRequired    : validateRequired,
               validateStartDate   : validateStartDate,
               validateEndJoinDate : validateEndJoinDate,
               getProgress         : getProgress,
               debValid            : debValid
            };

            vm.studyProject = {
               classId : swUtil.uuid()
            };

            vm.footer.buttonsConfig = {};

            vm.footer.isNextDisabled = true;
            vm.footer.isCreateDisabled = false;

            function setControlsState () {
               vm.$apply(function(){
                  vm.footer.isNextDisabled = !vm.form.$valid;
                  if ( vm.footer.buttonsConfig.save ) {
                     var valid = vm.wizardApi.isCoursePeriodBlockDisabled || vm.form.$valid;
                     vm.footer.isCreateDisabled = !valid || vm.studyProject.studyWeekDays.length === 0;
                  }
               });
            }

            var stepState = [{
               current   : true,
               done      : false,
               default   : false,
               stepClass : 'step current default-right'
            }, {
               current   : false,
               done      : false,
               default   : true, 
               stepClass : 'step default current-left default-right'
            }, {
               current   : false,
               done      : false,
               default   : true,
               stepClass : 'step default default-left'
            }];

            var _createStepClasses = function() {//formatted gshe's fn
               _.each(stepState, function(step, index) {
                  var classes = '';

                  if ( step.default ) {
                     classes += ' default';

                     if ( stepState[index - 1].current ) {
                        classes += ' current-left';
                     }

                     if ( index !== 0 && stepState[index - 1].done ) {
                        classes += ' done-left';
                     }
                  }
                  else if ( step.current ) {
                     classes += ' current';

                     if ( index !== stepState.length - 1 && stepState[index + 1].default ) {
                        classes += ' default-right';
                     }
                     
                     if ( index !== 0 && stepState[index - 1].done ) {
                        classes += ' done-left';
                     }

                     if ( index !== stepState.length - 1 && stepState[index + 1].done ) {
                        classes += ' done-right';
                     }
                  }
                  else if ( step.done ) {
                     classes += ' done';

                     if ( index !== stepState.length - 1 && stepState[index + 1].current ) {
                        classes += ' current-right';
                     }

                     if ( index !== 0 && stepState[index - 1].current ) {
                        classes += ' current-left';
                     }

                     if ( index !== stepState.length - 1 && stepState[index + 1].done ) {
                        classes += ' done-right';
                     }

                     if ( index !== 0 && stepState[index - 1].done ) {
                        classes += ' done-left';
                     }

                     if ( index !== stepState.length - 1 && stepState[index + 1].default ) {
                        classes += ' default-right';
                     }
                  }

                  if ( index === 0 ) {
                     classes += ' no-prev';
                  }

                  if ( index === stepState.length - 1 ) {
                     classes += ' no-next';
                  }
                  step.stepClass = classes;
               });
            };

            var _updateStepState = function(currentStep, prevStep){
               if ( currentStep !== prevStep && vm.form.$valid ) {
                  stepState[prevStep] = _.extend(stepState[prevStep], {
                     current : false,
                     done    : true,
                     default : false
                  });
               }
               stepState[currentStep] = _.extend(stepState[currentStep], {
                  current : true,
                  done    : false,
                  default : false
               });
               _createStepClasses();
            };

            vm.getStepClass = function (index) {
               return stepState[index].stepClass;
            };

            vm.swInit = function () {
               _updateStepState(activeStepIndex, activeStepIndex);
               buttonsConfigure();
               if (vm.publication && vm.publication.id) {
                  swPublicationsService.getPublicationDetails(vm.publication.id, 'remote').then(_onLoadPublicationInfo);
               }
               else {
                  vm.swSubmachine.go(vm.steps[activeStepIndex].name);
               }
            };

            function _onLoadPublicationInfo(publicationData) {
               vm.studyProject.publication = publicationData;
               vm.swSubmachine.go(vm.steps[activeStepIndex].name);
            }

            vm.goToStep = function (step) {
               var selectedStep = vm.steps.indexOf(step);

               swValidationService.setValidationMessagesEnabled(vm.form, true);

               if (
                      activeStepIndex < selectedStep && !vm.form.$valid ||
                      selectedStep - 1 !== activeStepIndex && stepState[selectedStep - 1] && !stepState[selectedStep - 1].done
                   )
               {
                  return false;
               }

               _updateStepState(selectedStep, activeStepIndex);
               vm.swSubmachine.go(step.name);
               activeStepIndex = selectedStep;
               vm.footer.isNextDisabled = true;
               buttonsConfigure();
            };

            vm.footer.goToStepPrev = function () {
               if ( activeStepIndex === 0 ) {
                  return false;
               }

               _updateStepState(activeStepIndex - 1, activeStepIndex);
               activeStepIndex--;
               vm.footer.isNextDisabled = true;
               vm.goToStep(vm.steps[activeStepIndex]);
               buttonsConfigure();
            };

            vm.footer.goToStepNext = function () {
               swValidationService.setValidationMessagesEnabled(vm.form, true);

               if ( activeStepIndex === vm.steps.length - 1 || !vm.form.$valid) {
                  return false;
               }

               _updateStepState(activeStepIndex + 1, activeStepIndex);
               activeStepIndex++;
               vm.isNextDisabled = true;
               vm.goToStep(vm.steps[activeStepIndex]);
               buttonsConfigure();
            };

            vm.footer.persist = function () {
               if ( vm.footer.isCreateDisabled ) {
                  return false;
               }

               var studyProjectData = {
                  classId            : vm.studyProject.classId,
                  publicationId      : vm.studyProject.publication.selectedId,
                  publicationType    : vm.studyProject.publication.type,
                  registeredAt       : Date.now(),
                  classType          : vm.studyProject.type,
                  name               : vm.studyProject.name,
                  description        : vm.studyProject.description,
                  studyWeekDays      : vm.studyProject.studyWeekDays,
                  allowDiscussions   : true
               };

               if ( vm.studyProject.expectedDailyWork ) {
                  studyProjectData.expectedDailyWork = parseFloat(vm.studyProject.expectedDailyWork) * 3600 * 1000;
               }

               if ( vm.studyProject.joinEndDate ) {
                  studyProjectData.joinEndDate = moment(vm.studyProject.joinEndDate).endOf('day').valueOf();
               }

               if ( vm.studyProject.classScheduledAt ) {
                  studyProjectData.scheduledAt = moment(vm.studyProject.classScheduledAt).startOf('day').valueOf();
               }

                  swStudyClassService.persistStudyClass(studyProjectData, 'createByClassId')
                   .then(function () {
                      swCreateStudyProjectService.hideCreateStudyProjectPopup();
                      swStudyClassService.resumeCourse({
                         classId: vm.studyProject.classId,
                         isInviteVisible: true
                      });
                   });
            };

            vm.swSubmachine.$onAfterAnyTransition = function () {
               if (vm.form) {
                  swValidationService.setValidationMessagesEnabled(vm.form, false);
               }
            };

            function getProgress() {
               var currentState = vm.swSubmachine.context().currState,
                   currentStateIdx = _.indexOf(vm.steps, _.findWhere(vm.steps, {name: currentState}));

               vm.steps.map(function (step, i) {
                  step.active = ( i <= currentStateIdx );
               });
            }

            function buttonsConfigure () {
               switch (activeStepIndex) {
                  case 0:
                     vm.footer.buttonsConfig = {
                        prev : false,
                        next : true,
                        save : false
                     };
                     break;

                  case vm.steps.length - 1:
                     vm.footer.buttonsConfig = {
                        prev : true,
                        next : false,
                        save : true
                     };
                     break;

                  default:
                     vm.footer.buttonsConfig = {
                        prev : true,
                        next : true,
                        save : false
                     };
                     break;
               }
            }

            function getObjectsItemValue (obj, index) {
               return obj[_.keys(obj)[index]];
            }

            //Validation Rules
            function validateRequired (value) {
               return {
                  required: {
                     value: value,
                     valid: value
                  }
               };
            }

            function validateStartDate (startDate) {
               return {
                  required: {
                     value: startDate,
                     active: true
                  },
                  future: {
                     active: true,
                     value: swDateService.toDttm(startDate)
                  }
               };
            }

            function validateEndJoinDate (joinEndDate) {
               return {
                  required: {
                     value: joinEndDate,
                     active: true
                  },
                  dateRange: {
                     value: joinEndDate,
                     min: swDateService.toDttm(vm.studyProject.classScheduledAt),
                     max: swDateService.toDttm(vm.studyProject.endCourse)
                  }
               };
            }

         }]
   });
});