define([
   'underscore',
   'module',
   'swServiceFactory'
], function(_, module, swServiceFactory) {
   'use strict';
   
   swServiceFactory.create({
      module : module,
      service : [

         '$q',
         '$window',
         'swLayoutManager',

         function(

            $q,
            $window,
            swLayoutManager

         ) {

         /* --- api --- */
         this.register     = register;
         this.unregister   = unregister;


         /* === impl === */

         var DEFAULT_OPTIONS = {
            next : $q.reject,
            rift : 250
         };

         swLayoutManager.register({
            id       : 'swLazyLoadingHelper',
            layout   : _layout
         });

         var _cache = {};

         function _layout(context) {
            if ( context.events.resizing || context.events.orienting )
            {
               _.each(_cache, _.partial(result, 'refreshSafeOffset'));
               _.each(_cache, _.partial(result, 'checkIfNeedLoadMore'));
            }
         }

         function register(scroll, options) {
            if (_.has(_cache, scroll.id)) {
               unregister(scroll);
               // throw new Error('It is impossible to add lazy loading in one scroll twice');
            }

            options = _.extend({}, DEFAULT_OPTIONS, options);

            var data = new Helper(scroll, options);
            _cache[scroll.id] = data;

            scroll.addListener(data.onScroll);
            return data;
         }

         function unregister(scroll) {
            if (scroll && _.has(_cache, scroll.id)) {
               var data = _cache[scroll.id];
               scroll.removeListener(data.onScroll);
               delete _cache[scroll.id];
            }
         }

         function result(key, object) {
            if (object) {
               var value = object[key];
               return _.isFunction(value) ? object[key]() : value;
            }
         }

         function Helper(scroll, options) {
            this.scroll    = scroll;
            this.options   = options;

            _.defer(this.refreshAndCheck.bind(this));

            // O_o
            this.onScroll = this.onScroll.bind(this);
         }

         Helper.prototype.onScroll = function(scrollTop) {
            if ( !this._inprogress && (scrollTop > (this.safeOffset - this.options.rift)) ) {
               var refreshAndCheck = _.partial(_.defer, _.bind(this.refreshAndCheck, this));
               var onNonItemsMore  = _.partial(unregister, this.scroll);
               var nextPage = this.options.next;
               this._inprogress = true;
               nextPage().then(refreshAndCheck, onNonItemsMore);
            }
         };

         Helper.prototype.refreshSafeOffset = function() {
            var $element = this.scroll.getScrollableElement();
            var elem = $element[0] === $window ? $window.document.body : $element[0];
            this.safeOffset = elem.scrollHeight - $element.innerHeight();
         };

         Helper.prototype.checkIfNeedLoadMore = function() {
            this.onScroll(this.scroll.getScrollTop());
         };

         Helper.prototype.refreshAndCheck = function() {
            this._inprogress = false;
            this.refreshSafeOffset();
            this.checkIfNeedLoadMore();
         };

         Helper.prototype.destroy = function() {
            unregister(this.scroll);
         };
      }]
   });
});
