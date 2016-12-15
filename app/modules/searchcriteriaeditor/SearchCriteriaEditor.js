define([

   'underscore',
   'swComponentFactory',
   'module',
   'text!./SearchCriteriaEditor.html',
   'less!./SearchCriteriaEditor'

   ], function(

   _,
   swComponentFactory,
   module,
   template

   ){

   'use strict';
   
     swComponentFactory.create({
        module : module,
        template: template,
        isolatedScope: {
           maxlength: '@',
           swSearch: '&',
           swOnChange: '&',
           swSearchCriteria: '=',
           swHelpContentKey: '@'
        },
        controller: ['$scope', '$element', 'swPopupService', 'swI18nService',
            function( $scope,   $element,   swPopupService,   swI18nService )
     {
        $scope.swInit = function()
        {
           $element.find('.sw-input-text').attr('sw-focus-default', $element.attr('sw-focus-default'));
        };
           
        $scope.search = function()
        {
           if ( _.isFunction($scope.swSearch))
           {
              $scope.swSearch();
           }
        };
        
        $scope.help = function($event)
        {
           swPopupService.showInfoBox({
              layout: {
                 of: $event.target,
                 arrow: true,
                 my: 'CT',
                 at: 'CB',
                 collision: {
                    flipHor:  false,
                    flipVer:  false,
                    rotate:   false,
                    shiftHor: true,
                    shiftVer: true
                 }
              },
              content: swI18nService.getResource($scope.swHelpContentKey)
           });
        };
        
        
     }]});

  });