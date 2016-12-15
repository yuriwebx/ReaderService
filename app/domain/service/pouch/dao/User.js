define([
    './DB',
    '../tools'
], function(DB, tools) {
    "use strict";


    return {
        getById: getById,
        getByIds: getByIds,
        getCurrentUser: getCurrentUser,
        getAll: getAll,
        setInfo: setInfo
    };

    /**
     *
     */
    function getCurrentUser() {
        return DB.user().get('login-info')
            .catch(function () {
                return {};
            })
            .then(function(localRecord) {
                return DB.user().byId('info')
                    .catch(function(){
                        return {};
                    })
                    .then(function(remoteRecord) {
                        if (localRecord._id && remoteRecord._id) {
                            return localRecord.updated > remoteRecord.updated ? localRecord : remoteRecord;
                        }
                        if (localRecord._id) {
                            return localRecord;
                        }
                        if (remoteRecord._id) {
                            return remoteRecord;
                        }
                        throw new Error("No 'info' and 'login-info' records in DB");
                    });
            });
    }

    /**
     *
     */
    function getById(id) {
        return getCurrentUser()
            .then(function(res) {
                if (res.id === id) {
                    res.userId = res.id;
                    return res;
                }

                return DB.query().byId(DB.id.user(id));
            });
    }

    /**
     *
     */
    function getByIds(ids) {
        return getCurrentUser()
            .then(function(curUser) {
                if (ids.length === 1 && ids[0] === curUser.id) {
                    return [curUser];
                }
                if (ids && ids.length) {
                    return DB.query().byIds(ids.map(DB.id.user));
                }
                return tools.Promise.resolve([]);
            });
    }

    /**
     *
     */
    function getAll(online) {
        return DB.query().byPrefix(DB.prefix.user, online);
    }

    /**
     *
     */
    function setInfo(info) {
        return DB.setUserInfo(info);
    }
});

