define([
    '../agentStorage',
    '../tools'
], function(agentStorage, tools) {
    "use strict";

    var prefix = {
        pub:               'pub',
        user:              'user',
        course:            'course',
        usernotes:         'usernotes',
        tags:              'tags',
        message:           'message',
        flashcard:         'flashcard',
        question:          'question',
        discussion:        'discussion',
        courseActivity:    'course-activity',
        discussionMessage: 'discussionmessage'
    };

    function idGenerator(prefix) {
        return function(id) {
            return prefix + '-' + (id || tools.guid());
        };
    }

    function nameGenerator(prefix) {
        return function(id) {
            return prefix + '_' + (id || tools.guid());
        };
    }

    // couch-like error
    /*
        {
          error : true,
          message : "missing",
          name : "not_found",
          reason : "missing",
          status : 404
        }
    */
    function error(code, name, message){
      var e = new Error(message || 'unknown');
      e.error = true;
      // e.message = message;
      e.name = name || "error";
      e.reason = e.message;
      e.status = code || 500;

      return e;
    }
    //
    function notFound(dataId){
      return error(404, "not_found", "missing " + (dataId||''));
    }

    function setUserInfo(info){
        return agentStorage.setUserInfo(info);
    }


    return {
        // public|user|userRW|course is a function!
        public: agentStorage.db.public,
        query:  agentStorage.db.query,
        user:   agentStorage.db.user,
        userRW: agentStorage.db.userRW,
        course: agentStorage.db.course(nameGenerator(prefix.course)),

        initSync: agentStorage.initSync,
        stopSync: agentStorage.stopSync,
        initCopy: agentStorage.initCopy,
        requestSync : agentStorage.requestSync,
        destroyLocalDB: agentStorage.destroyLocalDB,

        id: {
            pub               : idGenerator(prefix.pub),
            user              : idGenerator(prefix.user),
            course            : idGenerator(prefix.course),
            usernotes         : idGenerator(prefix.usernotes),
            tags              : idGenerator(prefix.tags),
            message           : idGenerator(prefix.message),
            flashcard         : idGenerator(prefix.flashcard),
            question          : idGenerator(prefix.question),
            discussion        : idGenerator(prefix.discussion),
            courseActivity    : idGenerator(prefix.courseActivity),
            discussionMessage : idGenerator(prefix.discussionMessage)
        },
        name: {
            course    : nameGenerator(prefix.course)
        },
        prefix  : prefix,
        setUserInfo: setUserInfo,
        error   : {
          notFound : notFound
        }
    };
});
