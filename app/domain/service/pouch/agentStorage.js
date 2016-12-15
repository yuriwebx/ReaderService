/*jshint browser: true */
define([
    'module',
    'swLoggerFactory',
    'Context',
    'ClientNodeContext',
    'PouchDB',
    // 'PouchAdapterSQLite',
    './tools',
    'q',
    'text!config/agent.config.json'
], function(module, swLoggerFactory, Context, ClientNodeContext, PouchDB, /*PouchAdapterSQLite, */tools, $q, _config) {
    "use strict";
    var Promise = tools.Promise;
    var logger = swLoggerFactory.getLogger(module.id);
    var loggerQuery = swLoggerFactory.getLogger(module.id + '.query');

    // load config
    var agentConfig = JSON.parse(_config).agent || {};
    if (agentConfig.enabled && !agentConfig.url) {
        logger.warn('Configuration missing: "url"');
        agentConfig.enabled = false;
    }

    var syncInterval = agentConfig.syncInterval || 5 * 60 * 1000; // 5 min
    var retryInterval = agentConfig.syncInterval / 2 ||  2 * 60 * 1000; // 2 min
    var queryInvalidateInterval = agentConfig.queryInvalidateInterval || 2 * 60 * 1000; // 2 min

    var initialized = false;

    // branch and brand create db prefix
    var dbPrefix = '';
    var syncDocId = 'sync-' + (ClientNodeContext.clientNodeId || '0');

    var dbNames = {
        public: 'public',
        query:  'query',
        user:   'user',
        userRW: 'user_rw'
    };


    if(!!window.cordova) {
        document.addEventListener('pause', immediateSync);
        document.addEventListener('resume', immediateSync);
    }


    // # private
    var noop = function(){};

    var dummyDb = null;  //  operate with dummy until we got storage initialized
    var dbPool = {};    // { "db name" : db object}
    var syncPool = {};  // { "db name" : DataFlow }
    var cred = {
        user: null,
        pass: null
    };
    var _syncConfigUserData = {

    }; // see _syncConfigSystemData

    // ALIAS => sync info
    // type = (sync|replicate)
    // mode = (live|query|timer)
    // score = (-1|<int>)  Score parameter applicable only for TIMER mode. Score -1 means that we ignore it in scoring system.
    var _syncConfigSystemData = {
        public : {
            type: 'replicate',
            mode: 'timer'
        },
        user_rw : {           // jshint ignore:line
            type: 'sync',
            mode: 'timer'
        }
    };

    var _queryTimeoutData = {
        user: {
            multiplier: 5
        },
        course: {},
        query: {}
    };


    /**
     * Initialize offline storage
     *
     * syncInfo - credentials for sync
     * Assume localStorage is available
     */
    var _initPromise;
    function init(userId) {
        if(_initPromise){
            return _initPromise;
        }

        // get environment
        var brand = Context.parameters.brand || '';
        var branch = Context.parameters.branch || '';
        dbPrefix = brand + '-' + branch;
        logger.info('Initialize offline storage [' + dbPrefix + '] for user:' + userId);


        // using dummy database until we recognize the user prevents some errors
        dummyDb = _initDb('dummy');
        bind('init', function(){
            // set timeout to verify that all pending promises are finished.
            setTimeout(function(){
                _destroy(dummyDb);
            }, 5000);
        });


        // check user and environment
        var localNames = Object.keys(dbNames).map(function(key) { return dbNames[key]; });
        var isClearDatabase = localStorage['_pouch_owner'] !== userId || localStorage['_pouch_db_prefix'] !== dbPrefix; //jshint ignore:line

        var cleanPromise = Promise.resolve();
        if (isClearDatabase) {
            logger.info('Wrong user or dbPrefix detected. Clearing databases');

            //remove databases defined in _syncConfigUserData
            // we will open foreign user db, what is generally not the best practice
            cleanPromise = Promise.resolve(dbNames.userRW)
                .then(_initDb)
                .then(function(db){
                    return db.get(syncDocId).catch(tools.pouch.default({}));
                }).then(function(syncConfig){
                    return Object.keys(syncConfig.data || {}).concat(localNames);
                }).then(function(names){
                    return Promise.all(names.map(_initAndDestroy));
                });
        }


        //
        _initPromise = cleanPromise
          .then(function() {
              return Promise.all(localNames.map(initDb));
          })
          .then(_loadUserSync) // TODO: user sync config is unused now
          //.then(_recalculateOrderField)
          .then(function() {
              localStorage['_pouch_owner'] = userId; //jshint ignore:line
              localStorage['_pouch_db_prefix'] = dbPrefix; //jshint ignore:line

              initialized = true;
              trigger('init', userId);
              logger.trace('Initialized!');
              return Promise.resolve();
          })
          .catch(function(e){
            logger.error(e);
            throw e;
          });

          return _initPromise;
    }



    /**
     *
     */
    function startSync(syncInfo) {

        if (!syncInfo.user || !syncInfo.pass || !syncInfo.prefix) {
            logger.warn('Configuration missing: "user", "pass" or "prefix" ');
            return Promise.reject();
        }

        if (cred.user) {
            //was called already (for some reason _onAuth called twice)
            return Promise.resolve();
        }

        cred = {
            user: syncInfo.user,
            pass: syncInfo.pass,
            prefix: syncInfo.prefix
        };

        if (!cred.user || !cred.pass) {
            throw new Error('"credentials" must be specified before running sync');
        }

        //
        if (initialized) {
            return _startSync();
        }
        else {
            bind('init', _startSync);
        }
        return Promise.resolve();
    }

    function _startSync() {
        unbind('init', _startSync);
        return Promise.all(
            // run system and user data flows
            Object.keys(_syncConfigSystemData).map(initSync).concat( updatePriorities() )
        );
    }



    /**
     * TODO: rename this method, because it doesn't correspond to startSync()
     */
    function stopSync(dbName) {
        if (syncPool[dbName]) {
            syncPool[dbName].stop();
            delete syncPool[dbName];
        }
        return Promise.resolve();
    }


    /**
     *
     */
    function getDb(name) {
        if(initialized && !dbPool[name]){
            logger.log("Attempt to access non-initialized database: " + name);
        }
        return initialized ? initDb(name) : dummyDb;
    }

    /**
     * @param {String} name
     * @returns {*}
     */
    function initDb(name) {
        if (!dbPool[name]) {
            dbPool[name] = _initDb(name);
        }
        return dbPool[name];
    }

    function _initDb(name){
        logger.trace('Initialize pouch database: ' + name);
        var db = new PouchDB(_localDbURI(name), {
            auto_compaction: true, // jshint ignore:line
            adapter : window.cordova ? 'websql' : 'idb'
        });

        // custom extensions
        db.getAll = pouchGetAll;
        db.getAllByPrefix = pouchGetAllByPrefix;
        db.getByKeys = pouchGetByKeys;

        //remote calls
        db.customDbName = name;
        db.byId = customQueryById;
        db.byIds = customQueryByIds;
        db.byPrefix = customQueryByPrefix;
        db.byView = customQueryByView;

        if(name === dbNames.userRW){
          db.createTask = pouchCreateTask;
        }

        return db;
    }


    /**
     * Destroy local db.
     * @return Promise
     */
    function destroyDb(dbName) {
        stopSync(dbName);

        delete dbPool[dbName];
        return _initAndDestroy(dbName);
    }

    function _initAndDestroy(dbName){
        return _destroy(_initDb(dbName));
    }

    // destroy and log
    function _destroy(db){
        return db.destroy().then(function(any){
            logger.trace('Database destroyed: ' + db._db_name); //jshint ignore:line
            return any;
        });
    }


    ///////////////////////////////////////////////////////////////////////////////
    // Flow data

    /**
     * Create data copy process
     */
    function initSync(dbName) {
        return _persistDataFlow(dbName);
    }

    /**
     * Request to sync database by timer.
     */
    function requestSync(dbName) {
        var config = _syncConfigUserData[dbName];
        if(!config){
            config = {
                type : 'replicate',
                mode : 'timer'
                // score: 0
            };
            _syncConfigUserData[dbName] = config;
        }

        config.score = tools.now();

        //
        _saveUserSync();
        updatePriorities();
    }

    /**
     * create&update data flow process in syncPool
     */
    function updatePriorities(){
        _recalculateOrderField();
        return Object.keys(_syncConfigUserData).map(_persistDataFlow);
    }


    /**
     * @return DataFlow (not a Promise)
     */
    function _persistDataFlow(dbName, opts) {
        opts = opts || {};
        var config = _syncConfigSystemData[dbName] || _syncConfigUserData[dbName];
        if(!config){
            // skip it
            logger.warn('unknown db config ', dbName);
            return Promise.resolve();
        }

        //
        if( !syncPool[dbName] ){
            syncPool[dbName] = new DataFlow(config.type, config.mode, dbName , {interval:syncInterval, delay: config.delayMultiplier}, opts);
            syncPool[dbName].start();
        }

        // if(config.mode === 'timer'){
        //     // apply priority
        //     if( syncPool[dbName].getInterval() !== syncInterval ) {
        //         syncPool[dbName].updateInterval( syncInterval );
        //     }
        // }

        return syncPool[dbName];
    }



    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // user sync config

    /**
     *
     */
    function _loadUserSync(){
        return getDb(dbNames.userRW).get(syncDocId)
            .catch(tools.pouch.default({}))
            .then(function(doc){
                _syncConfigUserData = doc.data || {};
                return true;
                // return _recalculateOrderField();
            });
    }
    function _saveUserSync(){
        return getDb(dbNames.userRW).get(syncDocId)
            .catch(tools.pouch.default({}))
            .then(function(doc){

                doc._id = doc._id || syncDocId;
                doc.type = doc.type || 'config';
                doc.data = _syncConfigUserData;

                return getDb(dbNames.userRW).put(doc);
            });
    }



    /**
     * Update _order field in _syncConfigUserData according to score points
     */
    function _recalculateOrderField(){
        var timerDbNames = Object.keys(_syncConfigUserData).filter(function(dbName){
            return _syncConfigUserData[dbName].mode === 'timer';
        });

        // collect non-negative scores into single array
        var scores = timerDbNames.map(function(dbName){
            return _syncConfigUserData[dbName].score || 0;
        })
        .concat(0)
        .filter(function(item){ return item >= 0; })

        // sort it. position became a priority
        .sort(function(a,b){ return b - a; });


        // save position as _order field
        timerDbNames.forEach(function(dbName){
            var config = _syncConfigUserData[dbName];
            config.score = config.score || 0;
            if(config.score >= 0){
                config._order = scores.indexOf(config.score);
            }
            else{
                config._order = -1;
            }
        });
    }


    /**
     * get corresponding local db name
     */
    function _localDbURI(localName) {
        return dbPrefix + localName;
    }

    /**
     * get corresponding remote db uri
     */
    function _remoteDbURI(localName) {

        if (!cred.prefix) {
            throw new Error('no prefix available. don\'t send request');
        }

        var dbName = localName;
        switch (localName) {

            case dbNames.public:
                dbName = cred.prefix + dbNames.public;
                return agentConfig.url + '/' + dbName;
                //////
            case dbNames.query:
                dbName = cred.prefix + dbNames.query;
                return agentConfig.url + '/' + dbName;
                //////
            case dbNames.user:
                dbName =  cred.prefix + 'user_' + cred.user;
                break;
            case dbNames.userRW:
                dbName = cred.prefix + 'user_' + cred.user + '_rw';
                break;
            default:
                dbName = cred.prefix + localName;
        }
        return agentConfig.url.replace(/\w+:[\///]{2}/, '$&' + cred.user + ':' + cred.pass + '@') + '/' + dbName;
    }







    /////////////////////////////////////////////////////////////////////////
    // pouch extensions
    function pouchGetAll(opts) {
        opts = opts || {};
        opts.include_docs = true; // jshint ignore:line
        return this.allDocs(opts) // jshint ignore:line
            .then(tools.pouch.extractDocs);
    }
    function pouchGetByKeys(keys) {
        return this.getAll({keys: keys}); // jshint ignore:line
    }
    function pouchGetAllByPrefix(prefix) {
        return this.getAll({startkey: prefix, endkey: prefix + '\uffff'}); // jshint ignore:line
    }
    function pouchCreateTask(input, type) {
        var nano = this; //jshint ignore:line
        var promise;
        if (input._id) {
            promise = nano.get('task-' + input._id)
                .catch(tools.pouch.default());
        }
        else {
            promise = Promise.resolve();
        }
        return promise
            .then(function(res) {
                return nano.put({ // jshint ignore:line
                    _id: 'task-' + (input._id || tools.guid()),
                    _rev: (res && res._rev) || undefined,
                    type: 'task',
                    name: type,
                    data: input,
                    created: Date.now()
                });
            });
    }



    //////// QUERY

    var pouchRemoteCache = {};
    function _getRemoteDb(dbName){
        if(!pouchRemoteCache[dbName]){
            pouchRemoteCache[dbName] = new PouchDB( _remoteDbURI(dbName), {
                skip_setup: true //jshint ignore:line
            });
        }
        return pouchRemoteCache[dbName];
    }

    /**
     *
     */
    function customQueryById(key) {
        var self = this;  //jshint ignore:line
        return self.byIds([key])
            .then(function(res) {
                return res && res.length ? res[0] : null;
            });
    }

    function customQueryByIds(keys) {
        var self = this;  //jshint ignore:line
        return customRequest.call(self, null, null, keys)
            .catch(tools.pouch.default([]));
    }


    /**
     *
     */
    function customQueryByPrefix(prefix, online) {
        var self = this;  //jshint ignore:line
        return customRequest.call(self, prefix, null, null, online)
            .catch(tools.pouch.default([]));
    }

    /**
     *
     */
    function customQueryByView(prefix, view, keys) {
        var self = this;  //jshint ignore:line
        return customRequest.call(self, prefix, view, keys)
            .catch(tools.pouch.default([]));
    }

    /**
     * @param {String} prefix prefix for Pouch DBs
     * @param {String} view view name on remote DB
     * @param {Array<string>} keys
     * @param {Boolean} online always send online request
     * @returns {Promise}
     * @private
     */
    function customRequest(prefix, view, keys, online){
        var self = this;  //jshint ignore:line

        var pouchReq;
        if(prefix){
            pouchReq = self.getAllByPrefix(prefix);
        }
        if (!prefix && !view && keys) {
            pouchReq = self.getByKeys(keys);
        }

        return pouchReq.then(function(localData) {
            if (online || !localData || !localData.length) {
                loggerQuery.trace('customRequest got empty result. going online');

                return getOnline.call(self, prefix, view, keys, localData);
            }
            if(needOnlineRequest(self.customDbName, localData)) {
                loggerQuery.trace('customRequest data need to be updated. going online');
                getOnline.call(self, prefix, view, keys, localData);
            }
            return tools.clone(localData);
        });
    }

    function getOnline(prefix, view, keys, localData) {
        var self = this; //jshint ignore:line
        return _customOnlineRequest.call(self, prefix, view, keys)
            .then(function(remoteData) {
                updateCacheData.call(self, remoteData, localData);
                return remoteData;
            });
    }

    function updateCacheData(newDocs, oldDocs) {
        var db = this; //jshint ignore:line
        var now = Date.now();
        newDocs.forEach(function(obj) {
            var oldObj = oldDocs.filter(function(i) {
                return i._id === obj._id;
            })[0];

            obj._rev = (oldObj && oldObj._rev) || undefined;
            obj.last_update = now;  //jshint ignore:line
        });

        return db.bulkDocs(newDocs);
    }

    function needOnlineRequest(dbName, data) {
        var multiplier = _queryTimeoutData[dbName] && _queryTimeoutData[dbName].multiplier || 1;
        data = data || [];
        if (!data.length) {
            return true;
        }
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                if (data[i].last_update && data[i].last_update + queryInvalidateInterval * multiplier < Date.now()) { //jshint ignore:line
                    return true;
                }
            }
        }
        return false;
    }

    function requestByPrefix(db, prefix) {
        return requestByView(db, 'prefix', [prefix]);
    }

    function requestByKeys(db, keys) {
        return handleResponse(db.allDocs({keys: keys, include_docs:true})); //jshint ignore:line
    }

    function requestByView(db, view, keys) {
        return handleResponse(db.query('schema/' + view, {keys: keys, include_docs:true})); //jshint ignore:line
    }

    function handleResponse(promise) {
        return promise
            .then(tools.pouch.extractDocs)
            .catch(function(e) {
                //status 0 - offline
                if (e.status !== 0 && e.status !== 404) {
                    logger.warn(e);
                }
                return [];
            });
    }

    function requestRemoteData(db, prefix, view, keys) {
        if (view){
            return requestByView(db, view, keys);
        }
        if (prefix) {
            return requestByPrefix(db, prefix);
        }
        if (keys) {
            return requestByKeys(db, keys);
        }

        loggerQuery.warn('cannot handle request ', db.customDbName, prefix, view, keys);
    }

    /**
     * @param {String} prefix prefix for Pouch DBs
     * @param {String} view view name on remote DB
     * @param {Array<string>} keys
     * @returns {*}
     * @private
     */
    function _customOnlineRequest(prefix, view, keys){
        var self = this;  //jshint ignore:line
        var dbName = self.customDbName;

        loggerQuery.trace('_onlineRequest', dbName,
            prefix ? ('<prefix> prefix=' + prefix) : "",
            view ? ('<view> view=' + view) : "",
            keys ? ('<ids> keys=' + keys) : "");
        return requestRemoteData(_getRemoteDb(dbName), prefix, view, keys);
    }

    /////////////////////////////////////////////////////////////////////////
    // Event emitter
    //
    // part of https://raw.githubusercontent.com/jeromeetienne/microevent.js/master/microevent.js
    var _events;

    function bind(event, fct) {
        _events = _events || {};
        _events[event] = _events[event] || [];
        _events[event].push(fct);
    }

    function unbind(event, fct) {
        _events = _events || {};
        if (event in _events === false) {
            return;
        }
        _events[event].splice(_events[event].indexOf(fct), 1);
    }

    function trigger(event /* , args... */ ) {
        logger.trace('Trigger event: ' + event);
        _events = _events || {};
        if (event in _events === false) {
            return;
        }
        for (var i = 0; i < _events[event].length; i++) {
            _events[event][i](Array.prototype.slice.call(arguments, 1));
        }
    }




    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // some user functions

    /**
     *
     */
    function setUserInfo(info) {
        //store in separate document instead of info
        var id = 'login-info';
        return getDb(dbNames.user).get(id)
            .catch(noop)
            .then(function(res) {
                var photoHash = info.photo && info.photo.fileHash || info.photo;
                var userInfo = {
                    _id: id,
                    _rev: res && res._rev,
                    id: info.id,
                    userId: info.id,
                    type: 'info',
                    firstName: info.firstName,
                    lastName: info.lastName,
                    created: info.registeredAt || info.created,
                    emailConfirmationStatus: info.emailConfirmationStatus,
                    hasPassword: info.passwordHash && info.passwordHash.length !== 0 || info.hasPassword,
                    email: [info.email],
                    photo: photoHash ? {fileHash: photoHash} : '',
                    photoLink: info.photoLink,
                    external: info.externaluserid || info.external,
                    roles: info.roles ? info.roles : getUserRole(info),
                    updated: Date.now()
                };
                return getDb(dbNames.user).put(userInfo);
            })
            .catch(noop);
    }

    function getUserRole(obj) {
        var roles = [];
        if (obj.adminRole) {
            roles.push('admin');
        }
        if (obj.editorRole) {
            roles.push('editor');
        }

        return roles.length === 0 ? ['user'] : roles;
    }




    //////////////////////////////////////////////////////

    var _dataFlowCounter = 0;
    /***
     * @class DataFlow

     * @param {String} type (sync|replicate)
     * @param {String} mode (live|query|timer)
     * @param {String} dbName
     * @param {Object} params: {interval:<int> }
     * @param {Object} opts extra pouch options
     */
    function DataFlow(type, mode, dbName, params, opts) {
        var self = this;

        var logger = swLoggerFactory.getLogger(module.id + '.DataFlow');

        if (type !== 'sync' && type !== 'replicate') {
            throw new Error('Invalid type: ' + type);
        }

        if (mode !== 'live' && mode !== 'timer') {
            throw new Error('Invalid mode: ' + mode);
        }

        if (mode === 'query') {
            logger.warn('query mode suspended');
            return;
        }

        //
        params = params || {};
        var syncMode = mode;
        var syncInterval = params.interval || 10 * 60 * 1000; // 10 min
        var delayMultiplier = params.delay || 1;
        var _id = _dataFlowCounter++;

        opts = opts || {};
        // merge opts and properties by default
        if(typeof opts.live !== "undefined"){
            throw new Error('"live" parameter cannot be changed');
        }

        opts.live = (syncMode === 'live');
        // 'retry' and 'back_off_function' are applicable only when options.live is also true
        opts.retry = opts.retry || opts.live;
        opts.back_off_function = opts.back_off_function || _pouchBackOff;   // jshint ignore:line


        _printTraceMessage();

        // runtime
        var sync;
        var _timer;
        var _timerTargetAt;


        /**
         * Begin synchronization
         */
        self.start = function(){
            return _initDataFlow();
        };

        /**
         * Stop synchronization
         */
        self.stop = function(){
            if(_timer){
                clearTimeout(_timer);
                _timer = null;
            }

            // sync.cancel(); // whenever you want to cancel
            if(sync){
                // cancel will cause 'complete' event
                sync.off('complete', _onComplete);
                sync.cancel();
                sync = null;
            }

        };

        /**
         *
         */
        self.getInterval = function(){
            return syncInterval;
        };

        /**
         *
         */
        self.updateInterval = function(milliseconds){
            if(syncInterval === milliseconds){
                return;
            }

            logger.info('Update timer for ' + dbName + ': ' + syncInterval + ' -> ' + milliseconds );
            syncInterval = milliseconds;

            if(syncMode === 'timer' && _timer){
                var timeElapsed = _timerTargetAt - tools.now();
                if( timeElapsed > syncInterval){
                    // update timer to lower value.
                    scheduleNextSync(syncInterval);
                }

            }
        };

        /**
         *
         */
        self.immediateSync = function() {
            scheduleNextSync(1);
        };


        /**
         *
         */
        function _printTraceMessage(){
            var localDb = _localDbURI(dbName);
            var remoteDb = _remoteDbURI(dbName);

             // this is a general trick for string templating. In this case it looks not so impressive as it can
            logger.info('[%id] Creating %mode%2 %type: %name %remoteuri %5 %localuri'
                .replace('%id', _id )
                .replace('%mode', opts.live ? 'live' : syncMode )
                .replace('%2',    syncMode === 'timer' ? '(' + syncInterval / 1000 + 's)' : '' )
                .replace('%type', type)
                .replace('%name', dbName)
                .replace('%remoteuri', tools.safeUrl(remoteDb))
                .replace('%5', (type === 'sync') ? ' <=> ' : ' => ')
                .replace('%localuri', localDb) );
        }

        function _printStartMessage(){
            logger.info('[%id] Run %mode %type %name'
                .replace('%id', _id )
                .replace('%mode', opts.live ? 'live' : syncMode )
                .replace('%type', type)
                .replace('%name', dbName)
            );

        }


        function parseDump(data) {
            var docs = [];
            var lastSeq = 0;
            try {
                var res = JSON.parse(data);
                docs = res.docs;
                lastSeq = res.seq;
            } catch (err) {
                return {err: err};
            }
            return {docs: docs, lastSeq: lastSeq};
        }

        function loadDump() {
            if (dbName !== dbNames.public) {
                return Promise.resolve();
            }

            logger.trace('Loading dump for ' + dbName);
            return getDb(dbName).info()
                    .then(function(info) {
                        if (info.update_seq === 0) { //jshint ignore:line
                            return _loadDump()
                                    .then(function(res) {
                                        if (res) {
                                            var data = parseDump(res);
                                            opts.since = data.lastSeq;
                                            return getDb(dbName).bulkDocs({docs: data.docs, new_edits: false}); //jshint ignore:line
                                        }
                                        return null;
                                })
                                .catch(function(req){
                                    logger.warn('Loading dump for ' + dbName + ' failed with status ' + req.status);
                                    return null;
                                });
                        }
                        else{
                            return Promise.resolve();
                        }
                    });
            }

        function _loadDump() {
            return _request(Context.downloadUrl + 'dump/' + dbName);
        }




        var availabilityCache = [];
        /**
         * Make sure db exist
         * Prevent appearing basic authorization dialog.
         */
        function checkDB(url, _defer) {

            var defer = _defer || $q.defer(); //jshint ignore:line

            var authRequired = url.indexOf('@') > -1;
            if(!authRequired || availabilityCache.indexOf(url) >= 0 ){
                defer.resolve(true);
                return defer.promise;
            }

            var req = new XMLHttpRequest();   //jshint ignore:line
            req.open('GET', url, true);
            if (authRequired) {
                // well, in general we should use credentials from url
                req.setRequestHeader("Authorization", "Basic " + btoa(cred.user + ":" + cred.pass)); //jshint ignore:line
            }
            req.onreadystatechange = function () {
                if (req.readyState === 4) {
                    if (req.status === 200) {
                        defer.resolve(req.response);
                        return;
                    }
                    var interval = retryInterval;
                    if (req.status === 0) {
                        interval = retryInterval * 2;
                    }
                    setTimeout(checkDB.bind(this, url, defer), interval); //jshint ignore:line
                }
            };
            logger.trace('Check availability of ', tools.safeUrl(url) );
            req.responseType = "text";
            req.send();

            return defer.promise.then(function(){
                availabilityCache.push(url);
                logger.info('    Available: ', tools.safeUrl(url) );
                return true;
            });
        }




        /**
         *
         */
        function _initDataFlow(){
            // init sync
            var localDb = _localDbURI(dbName);
            var remoteDb = _remoteDbURI(dbName);

            // update parameters right before sync to prevent some bugs
            opts.live = (syncMode === 'live');
            opts.retry = opts.live;
            opts.skip_setup = true; // jshint ignore:line

            var onChangeCallback = (type === 'sync') ? _onChangeSync : _onChangeReplication;
            //
            return checkDB(remoteDb).then(loadDump).then(function() {
                _printStartMessage();
                
                // do not swap source and destination! (remoteDb and localDb)
                sync = PouchDB[type](remoteDb, localDb, opts)

                // more info about events: https://pouchdb.com/api.html#replication
                .on('change', function(info) {
                    logger.trace('change', dbName/*, info */); // info
                    // handle change
                    onChangeCallback(info);
                }).on('paused', function() {
                    logger.trace('paused', dbName);
                    // replication paused (e.g. user went offline)
                }).on('active', function() {
                    logger.trace('active', dbName);
                    // replicate resumed (e.g. user went back online)
                }).on('denied', function(/*info*/) {
                    logger.warn('denied', dbName/*, info*/);
                    // a document failed to replicate (e.g. due to permissions)
                })
                .on('complete', _onComplete)
                .on('error', function(/*err*/) {
                    // try {
                    //     logger.trace('error', dbName, err && err.message);
                    // }catch(e){
                    //     if(e.message !== 'Converting circular structure to JSON') {
                    //         console.log(e);
                    //     }
                    // }
                    // handle constant error (occurs when retry==false)
                    scheduleNextSync(retryInterval);

                }).on('requestError', function(err) {
                    logger.trace('requestError', dbName, err && err.message);
                    //this.emit('error', err);
                    // handle requestError error (when retry==true)
                });

                return sync;
            });

        }

        /**
         *
         */
        function _onComplete(info){
            logger.trace('complete', dbName, info);
            if( syncMode === 'timer' || !info.ok){
                // schedule next sync
                var isOk = (info.pull && info.push) ? (info.pull.ok && info.push.ok) : info.ok;
                scheduleNextSync(isOk ? syncInterval * delayMultiplier : retryInterval);
            }
        }

        /**
         *
         */
        function scheduleNextSync(timeout){
            if(_timer){
                clearTimeout(_timer);
                _timer = null;
            }

            if(syncMode === 'timer' && timeout > 0){
                _timer = setTimeout(_initDataFlow.bind(self),  timeout);
                _timerTargetAt = tools.now() + timeout;
                logger.info('[%id] Scheduled [%dbname] sync in %sec sec'.replace('%id', _id).replace('%dbname', dbName).replace('%sec', timeout / 1000) );
            }
        }




        // onChange for replication
        function _onChangeReplication(info) {
            trigger('update_received', info, dbName);

            // check for errors
            // replication
            if (typeof info.ok !== "undefined" && !info.ok) {
                logger.warn('Replication error occurred', info);
            }

        }

        // onChange for synchronization
        function _onChangeSync(info) {
            if (info && info.direction === "pull") {
                // client send changes
                trigger('update_sent', info.change, dbName);
            }
            if (info && info.direction === "push") {
                // client receive changes
                trigger('update_received', info.change, dbName);
            }

            // check for errors
            // sync
            if (info.changes && typeof info.changes.ok !== "undefined" && !info.changes.ok) {
                logger.warn('Sync error occurred', info);
            }
            if (info.push && typeof info.push.ok !== "undefined" && !info.push.ok) {
                logger.warn('Sync push error occurred', info);
            }
            if (info.pull && typeof info.pull.ok !== "undefined" && !info.pull.ok) {
                logger.warn('Sync pull error occurred', info);
            }
        }

        /**
         *
         */
        function _pouchBackOff(/*delay*/) {
            // TODO: manage online/offline state?
            // trigger('offline');
            return retryInterval;
        }

    }//-DataFlow


    /**
     * @param {String} url
     * @param {Object} opts request options
     * @returns Promise {String}
     * @private
     */
    function _request(url, opts) {
        opts = opts || {};

        var defer = $q.defer(); //jshint ignore:line

        var req = new XMLHttpRequest();   //jshint ignore:line
        req.open('GET', url, true);
        trigger('dump_loading_start');
        if (opts.headers) {
            for (var name in opts.headers){
                if(opts.headers.hasOwnProperty(name)){
                    req.setRequestHeader(name, opts.headers[name]);
                }
            }
        }
        req.onprogress = function(e) {
            if (e.lengthComputable) {
                logger.trace('loaded ', e.loaded, '  total', e.total);
                trigger('dump_loading_progress', parseInt(e.loaded / e.total * 100));
            }
        };
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                trigger('dump_loading_end');
                if (req.status > 0 && req.status < 400) {
                    defer.resolve(req.response);
                }
                else{
                    defer.reject(req);
                }
            }
        };
        req.responseType = "text";
        req.send();

        return defer.promise;
    }

    function immediateSync(dbs) {
        dbs = dbs || [dbNames.public, dbNames.userRW];

        dbs.forEach(function(db) {
            if (syncPool[db]) {
                syncPool[db].immediateSync();
            }
        });
    }

    window.syncNow = immediateSync; //jshint ignore:line

    //////////////////////////////////////////////////////
    return {
        init: init,
        setUserInfo: setUserInfo,
        dbNames : dbNames,

        syncNow: immediateSync,

        db : {
          public : function(){ return getDb(dbNames.public); },
          query  : function(){ return getDb(dbNames.query); },
          user   : function(){ return getDb(dbNames.user); },
          userRW : function(){ return getDb(dbNames.userRW); },
          course : function(generator){return function(courseId) {return getDb(generator(courseId));};}
        },
        initSync: initSync,
        startSync: startSync,
        stopSync: stopSync,
        initCopy: initSync,
        requestSync : requestSync,
        destroyLocalDB: destroyDb,


        // event emitter
        on: bind,
        off: unbind
    };


});
