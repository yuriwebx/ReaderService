/**
 * swAgentService
 */

/* global window: false */
/* global console: false */
define(['module',
        'swServiceFactory',
        'swLoggerFactory',

        './pouch/controllers',
        './pouch/agentStorage',
        'text!config/agent.config.json',
        './pouch/tools',
        'ClientNodeContext'
    ],
    function(module, swServiceFactory, swLoggerFactory,
        controllers, agentStorage, _config, tools, ClientNodeContext) {
        'use strict';

        var Promise = tools.Promise; //FIX:

        var logger = swLoggerFactory.getLogger(module.id);

        var agentConfig = JSON.parse(_config).agent || {};

        /**
         *
         */
        var serviceController = ['swRestService', '$rootScope' ,'swApplicationToolbarService',
            function AgentService(swRestService, $rootScope, swApplicationToolbarService) {
            var that = this;

            var enabled = agentConfig.enabled;  // offline enabled
            var userAuthenticated = false;
            var logRequest = agentConfig._log_request;   // jshint ignore:line
            var syncEnabled = agentConfig._sync_enabled; // jshint ignore:line

            var noCallRequestMethod = 'noop';

            var requestSeq = 0;



            Object.keys(controllers).forEach(function(key) {
                var upd = key.split('/').pop();
                controllers[upd] = controllers[key];
                delete controllers[key];
            });
            that.controllers = controllers;
            that.tools = tools;


            that.dbNames = agentStorage.dbNames;
            that.setCredentials = setCredentials;
            that.request = request;
            that.isExist = isExist;
            that.isEnabled = function() {
                return enabled;
            };

            that.on = agentStorage.on;
            that.off = agentStorage.off;
            that.syncNow = agentStorage.syncNow;

            that.syncUserData = function(){
                if (that.isEnabled()) {
                    that.syncNow([that.dbNames.userRW]);
                }
            };


            /**
             * syncInfo - credentials for sync
             */
            function setCredentials(user) {
                var syncInfo = user.sync;
                if (!syncInfo) {
                    logger.warn('Offline mode disabled due to invalid credentials');
                    enabled = false;
                    return;
                }
                userAuthenticated = true;
                //TODO fix swApplicationToolbarService.isReader behavior
                enabled = enabled &&
                    (swApplicationToolbarService.getModuleName() === 'AppReader' &&
                    !swApplicationToolbarService.isEditor() &&
                    (ClientNodeContext.platformType === 'Desktop' && window.navigator.vendor.indexOf('Google') > -1) || ClientNodeContext.native);

                if (enabled) {
                    agentStorage.init(syncInfo.user)
                        .then(function() {
                            return agentStorage.setUserInfo(user);
                        })
                        .then(function() {
                            if (enabled && syncEnabled) {
                                return agentStorage.startSync(syncInfo)
                                    .catch(function(e){
                                        logger.error('startSync failed:', e);
                                        throw e;
                                    });
                            }
                        })
                        .catch(function(e) {
                            logger.warn('Offline mode has an error: ' + e.message);
                            // enabled = false;
                        });
                }
            }

            /**
             * @param {String} method : get|post|etc..
             * @param {String} controller
             * @param {String} action
             * @param {any} data
             * @param {Object} params : Request params. Actually, ignored in offline mode
             * @param {String} _requestMethod swRestService method name
             */
            function request(method, controller, action, data, params, _requestMethod) {
                return _request(method, controller, action, data, params, _requestMethod);
            }

            function _request(method, controller, action, data, params, _requestMethod) {
                if (typeof action === 'object') {
                    // shift arguments
                    _requestMethod = params;
                    params = data;
                    data = action;
                    action = '';
                }

                action = action || '';
                _requestMethod = _requestMethod || 'restSwHttpRequest';
                var requestId = ('000000' + requestSeq++).substr(-6);

                //
                var onlineRequest = function(){
                    //
                    if(_requestMethod === noCallRequestMethod){
                        var config =  _createFakeAjaxRequest(method, controller, action, data, params);
                        return Promise.resolve(_createFakeAjaxResponse(config));
                    }
                    else{
                        return swRestService[_requestMethod](method, controller, action, data, params);
                    }
                };

                if (enabled && that.isExist(method, controller, action) && userAuthenticated) {
                    method = method && method.toUpperCase() || 'GET';
                    //
                    if (controller === 'Reports' && data ||
                        controller === 'StudyClass' && action === 'invitestudents' ||
                        controller === 'StudyClass' && action === 'persiststudentstatus' ||
                        controller === 'StudyClass' && action === 'persistteachersstatus') {
                        //for sending data through API
                        data.reqParams = {
                            url: swRestService.getUrlString(controller, action),
                            method: method
                        };
                    }

                    controller = controller.toLowerCase();

                    var pseudoUrl = method + ' ' + controller + '/' + action;

                    logger.trace('Offline request ' + pseudoUrl);
                    logRequest && console.log('%cOffline request [%s]', 'color:#3434B5', requestId, pseudoUrl, data); // jshint ignore:line

                    var config =  _createFakeAjaxRequest(method, controller, action, data, params);
                    var result = that.controllers[controller][method][action](data, onlineRequest);

                    return Promise.resolve(result)
                            .then(_createFakeAjaxResponse(config))
                            .then(function(data){
                                logRequest && console.log('%c       response [%s]', 'color: #6D6D6D', requestId,  pseudoUrl, data.data/*, data*/); // jshint ignore:line
                                return data;
                            })
                            .then(function(data){
                                _refreshGlobalScope();
                                return data;
                            })
                            .catch(function(err){
                                logRequest && console.log('%c       response failed [%s]', 'color: #B17233', requestId,  pseudoUrl, err); // jshint ignore:line
                                logger.warn(' response failed ' + pseudoUrl, err);
                                throw err;
                            });

                }
                else{
                    // fallback
                    return onlineRequest();
                }
            }

            /**
             *
             */
            function _createFakeAjaxRequest(method, controller, action, data){
                action = action || '';
                return {
                    data: data,
                    method : method,
                    url: controller + '/' + action
                };
            }

            /**
             *
             */
            function _createFakeAjaxResponse(config) {
                return function(data) {
                    return {
                        config: config,
                        status: 200,
                        statusText: "OK",
                        //headers: function(name){}, // TODO: make it on demand
                        data: data
                    };
                };
            }

            /**
             *
             */
            function isExist(method, controller, action) { // jshint ignore:line
                method = method && method.toUpperCase() || 'GET';
                controller = controller.toLowerCase();
                action = action || '';
                return that.controllers[controller] && that.controllers[controller][method] && that.controllers[controller][method][action];
            }

            /**
             *
             */
            function _refreshGlobalScope(){
                // quick workaround
                $rootScope.$applyAsync(function(){});
            }

        }]; /////////////////


        ////////////////////////////////
        swServiceFactory.create({
            module: module,
            service: serviceController
        });

    }
);
