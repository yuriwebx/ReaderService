define([
    './User',
    './UserStudy',
    './DB',
    '../tools',
    'underscore'
], function(User, UserStudy, DB, tools, _) {
    "use strict";
    var Promise = tools.Promise;

    return {
        searchByClass: searchByClass,
        initDiscussion: createDiscussion,
        updateMessagesState: updateMessagesState,
        persistMessage: persistMessage,
        persistDiscussion: persistDiscussion,
        getDiscussions: getDiscussions
    };

    function _unprefix(prefix) {
        return function (id) {
            if (("" + id).startsWith(prefix)) {
                id = id.substr(prefix.length + 1);
            }
            return id;
        };
    }

    function getByPrefix(classId, prefix) {
        return Promise.all([
                DB.userRW().getAllByPrefix(prefix).catch(tools.pouch.default([])),
                DB.course(classId).byPrefix(prefix).catch(tools.pouch.default([]))
        ]).then(function(data) {
            data = data || [];
            var result = [];
            if(data[0]){
                result = result.concat(data[0]);
            }
            if(data[1]){
                result = result.concat(data[1]);
            }
            return _.uniq(result, function(obj) {return obj._id;});
        });
    }

    function searchByClass(classId, bookId) {
        return tools.Promise.all([
                getByPrefix(classId, DB.prefix.discussion),
                getDiscussionActivity(classId)
            ])
            .then(function(res) {
                var data = res[0];
                var activity = res[1];

                var userIds = new tools.MySet();

                var discussions = data.filter(function(obj) {
                    if (obj.type === DB.prefix.discussion && (bookId ? obj.bookId === bookId : true)) {
                        obj._id = _unprefix(DB.prefix.discussion)(obj._id);

                        var discussionActivity = activity[obj._id];
                        obj.messages = data.filter(function(msg) {
                            return msg.type === DB.prefix.discussionMessage && obj._id === msg.discussionId;
                        }).map(function(msg) {
                            msg.userId = msg.owner;
                            msg.messageId = _unprefix(DB.prefix.discussionMessage)(msg._id);

                            userIds.add(msg.userId);

                            var msgActivity = (discussionActivity && discussionActivity.messages[msg.messageId]) || {};

                            msg.informed = msgActivity.informed || false;
                            msg.reviewed = msgActivity.reviewed || false;

                            return msg;
                        });
                        return true;
                    }
                    return false;
                });

                return User.getByIds(userIds.toArray())
                    .then(function(users) {
                        discussions.forEach(function(d) {
                            d.messages.forEach(function(msg) {
                                var user = users.filter(function(u) {
                                    return u.userId === msg.userId;
                                })[0] || {};
                                msg.userProfile = {firstName: user.firstName, lastName: user.lastName};
                            });
                        });

                        return discussions;
                    });
            });
    }

    function createDiscussion(discussion) {
        return User.getCurrentUser()
            .then(function(user) {
                var id = discussion._id;
                discussion._id = DB.id.discussion(discussion._id);
                discussion.type = 'discussion';
                discussion.owner = user.id;

                return DB.userRW().put(discussion)
                    .then(function() {
                        discussion._id = id;
                        return discussion;
                    });
            });
    }

    function getDiscussions(classDiscussions) {
        return tools.Promise.all(classDiscussions.map(function (c) {
            return searchByClass(c.classId).catch(function () {
                return [];
            });
        }))
        .then(function(res) {
            var discussions = [];
            res.forEach(function (list) {
                discussions = discussions.concat(list);
            });

            return discussions.filter(function (d) {
                return classDiscussions.map(function(obj) {return obj.classDiscussionId;}).indexOf(d._id) > -1;
            });
        });
    }

    function updateMessagesState(classDiscussions, informed, reviewed) {
        return getDiscussions(classDiscussions)
            .then(function(discussions) {
                return Promise.all(discussions.map(function(discussion) {
                    return getDiscussionActivity(discussion.classId)
                        .then(function(res) {
                            discussion.messages.forEach(function(msg) {
                                msg.userId = msg.owner;
                                res[msg.discussionId] = res[msg.discussionId] || {};
                                res[msg.discussionId][_unprefix(DB.prefix.discussionMessage)(msg._id)] = {
                                    informed: informed,
                                    reviewed: reviewed
                                };
                            });
                            return updateDiscussionActivity(discussion.classId, res);
                        });
                }));
            });
    }

    function updateDiscussionActivity(classId, data) {
        return UserStudy.getPublicationSummary(classId)
            .then(function(activity) {
                var itemActivity = activity.items[activity.currentItemId];

                itemActivity.discussion = data;

                return UserStudy.update(classId, activity);
            });
    }

    function updateMessageState(classDiscussionId, messageId, classId, informed, reviewed) {
        return getDiscussionActivity(classId)
            .then(function(res) {
                res[classDiscussionId] = res[classDiscussionId] || {
                        messages: {}
                    };
                res[classDiscussionId][messageId] = {
                    informed: informed,
                    reviewed: reviewed
                };

                return updateDiscussionActivity(classId, res);
            });
    }

    function getDiscussionActivity(classId) {
        return UserStudy.getPublicationSummary(classId)
            .then(function(activity) {
                var itemActivity = activity[activity.currentItemId] || {};
                return itemActivity.discussion || {};
            });
    }

    function persistMessage(msg) {
        return User.getCurrentUser()
        .then(function(user) {
            return DB.userRW().put({
                _id: DB.id.discussionMessage(msg.messageId),
                discussionId: msg.classDiscussionId,
                classId: msg.classId,
                parentMessageId: msg.parentMessageId,
                createdAt: Date.now(),
                level: msg.level,
                text: msg.text,
                owner: user.id,
                type: 'discussionmessage',
                userRole: msg.userRole
            });
        })
        .then(function() {
            return updateMessageState(msg.classDiscussionId, msg.messageId, msg.classId, true, true);
        })
        .then(tools.onSuccess);
    }

    function persistDiscussion(discussion) {
        delete discussion.author;
        delete discussion.type;
        delete discussion.messages;
        return User.getCurrentUser()
            .then(function(user) {
                discussion.authorId = user.id;

                return createDiscussion(discussion);
            });
    }

});
