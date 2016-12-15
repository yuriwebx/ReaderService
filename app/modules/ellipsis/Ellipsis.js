define([
   'underscore',
   'ngModule',
   'dotdotdot'
],
function ( _, ngModule ) {
   'use strict';

   var DIRECTIVE_NAME = 'swEllipsis';

   ngModule.directive( DIRECTIVE_NAME, ['swLayoutManager', swEllipsisDirective]);

   function swEllipsisDirective(swLayoutManager)
   {
      return {
         restrict: 'A',
         link: function( scope, element, attr )
         {
            var id = scope.$id;

            swLayoutManager.register({
               id    : id,
               layout: _onLayout
            });

            element.on('$destroy', function(){
               swLayoutManager.unregister(id);
            });

            scope.$watch(attr[DIRECTIVE_NAME], _.partial(_.defer, _refresh));
            _.defer(_refresh);

            function _refresh(isActive) {
               isActive = _.isBoolean(isActive) ? isActive : attr[DIRECTIVE_NAME];
               isActive = _.isBoolean(isActive) ? isActive : true;

               element.trigger('destroy.dot').toggleClass('sw-ellipsis', isActive);
               if (isActive) {
                  element.dotdotdot();
               }
            }

            function _onLayout(context) {
               var e = context.events;
               if ( e.resizing || e.orienting ) {
                  element.trigger('update.dot');
               }
            }
         }
      };
   }
});
