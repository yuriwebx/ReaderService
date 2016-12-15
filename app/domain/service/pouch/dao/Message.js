define([
    './DB',
    '../tools'
], function(DB, tools) {
    "use strict";

    var messageTypes = {
        "PersonalMessage" : 1,
        "ClassNotificationMessage" : 1,
        "StudyGuideNotificationMessage" : 1
    };

    return {
        search: search,
        update: update,
        persist: persist
    };


    /**
     *
     */
    function search(params) {
        params = params || {};
        return DB.userRW().getAllByPrefix(DB.prefix.message)
            .then(function(res) {
                var out = res;
                if (params.reviewed !== undefined) {
                    out = res.filter(function(msg) {
                        return msg.reviewed === params.reviewed;
                    });
                }

                out.forEach(function(msg) {
                    if(!messageTypes[msg.type]) {
                        msg.type = msg.msgType;
                    }
                });

                return out;
            });
    }

    /**
     *
     */
    function update(params) {
        params = params || {};
        return DB.userRW().getByKeys((params.messageIds || []))
            .then(function(msgs) {
                return tools.Promise.all(msgs.map(function(msg) {
                    msg.reviewed = params.reviewed;

                    return DB.userRW().put(msg);
                }));
            });
    }

    function persist(data) {
        data.registeredAt = Date.now();
        data._id = tools.guid();
        data.msgType = (data.extendMessageParams && messageTypes[data.extendMessageParams.type]) ?
           data.extendMessageParams.type :
           'PersonalMessage';
        return DB.userRW().createTask(data, 'message-send');
    }

});
