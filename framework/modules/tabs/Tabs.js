/**
 * Usage:
 * 
 *   <sw-tabs class="sw-test-tabs" sw-tabs-model="testTabsModel"></sw-tabs>
 * 
 *   var _activeTabId = 't1';
 *   $scope.testTabsModel = {
 *      tabs: [
 *         { id: 't1', text: 'text1', indicator: 'indicator1' },
 *         { id: 't2', text: 'text2', indicator: 'indicator2' },
 *         { id: 't3', text: 'text3', indicator: 'indicator3' }
 *      ],
 *      click: function(tab)
 *      {
 *         _activeTabId = tab.id;
 *      },
 *      isActive: function(tab)
 *      {
 *         return _activeTabId === tab.id;
 *      }
 *   };
 *        
 */
define([

   'module',
   'ngModule',
   'swLoggerFactory',
   'text!./Tabs.html',
   'less!./Tabs'

   ], function(

   module,
   ngModule,
   swLoggerFactory,
   template

   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swTabs', [function()
   {
      logger.trace('register');
      
      return {
         restrict: 'E',
         scope: true,
         template: template,
         replace: true,
         link: function(scope, element, attr)
         {
            /*jshint unused:true */
            scope.model = scope.$eval(attr.swTabsModel);
         }
      };
      
   }]);
});