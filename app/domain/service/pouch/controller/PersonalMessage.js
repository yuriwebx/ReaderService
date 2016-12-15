define([
    '../dao/Message',
    '../dao/StudyClass'
], function(Message, StudyClass) {
    "use strict";

    return {
        GET: {
            'search': search
        },
        POST: {
            'updatestate' : update,
            'persist' : persist
        }
    };

    function search(req){
        return Message.search(req)
            .then(function(msgs) {

                var classIds = [];

                msgs.forEach(function(msg) {
                    if (msg.classId && classIds.indexOf(msg.classId) < -1) {
                        classIds.push(msg.classId);
                    }
                });

                //TODO get raw data
                return StudyClass.getAll(classIds)
                    .then(function(classes) {

                        msgs.forEach(function(msg) {
                            if(msg.classId) {
                                var cls = findClass(msg.classId, classes);
                                msg.studyClassStatus = cls.class && cls.class.status;


                                var student = findStudent(msg.toUserId, cls);
                                msg.studentConfirmationStatus = student.studentConfirmationStatus;
                                msg.teacherStatus = student.teacherConfirmationStatus;
                            }
                        });

                        return msgs;
                    });

            });
    }

    function findClass(classId, classes) {
        return classes.filter(function(c) {
            return c.class.classId === classId;
        })[0] || {};
    }

    function findStudent(userId, cls) {
        return cls.membership && cls.membership.filter(function(c) {
            return c.studentId === userId;
        })[0] || {};
    }


    function update(req){
        return Message.update(req);
    }

    function persist(req) {
        return Message.persist(req);
    }
});
