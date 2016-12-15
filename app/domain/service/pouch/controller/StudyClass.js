define([
    '../dao/StudyClass',
    '../dao/StudyCourse',
    '../dao/Publication',
    '../dao/Discussion',
    'underscore',
    '../tools'
], function(StudyClass, StudyCourse, Publication, Discussion, _, tools) {
    "use strict";

    return {
        GET:{
            searchstudyclasses: searchClasses,
            info: info,
            searchstudents: searchStudents,
            searchstudentsforclass: searchStudentsForClass,
            searchbypublication: searchByPublication,
            searchTeachers: searchTeachers
        },
        POST: {
            persist: persist,
            cancelstudyclass: cancel,
            invitestudents: invite,
            persiststudentstatus: setStudentStatus,
            persistteachersstatus: setTeacherStatus
        }
    };

    function searchStudents(req) {
        return StudyClass.searchStudents(req.classId, req.filter, req.itemsCount);
    }

    function searchClasses(/*req*/) {
        return StudyClass.getAll();
    }

    function info(req) {
        return StudyClass.info(req.classId);
    }

    function persist(req) {
        var studyClass = req.studyClass;
        //req.type == createByClassId, createByPublicationId, used only the first one
        return StudyClass.save(studyClass)
            .then(function() {
                return initDiscussions(studyClass);
            });
    }

    function initDiscussions(studyClass) {
        var publicationId = studyClass.publicationId;
        return (studyClass.publicationType === 'StudyCourse' ? StudyCourse.get(publicationId) : tools.Promise.resolve(publicationId))
        .then(function(response) {
            var publicationsIds;
            if (_.isObject(response)) {
                publicationsIds = response.studyCourseItems
                    .map(function (item) {
                        return item.studyGuideId;
                    })
                    .filter(Boolean);
            }
            else {
                publicationsIds = [response];
            }

            return tools.Promise.all([
                Publication.getByIds(publicationsIds),
                Discussion.searchByClass(studyClass.classId)
            ]);
        })
        .then(function(res) {
            var response = res[0];
            var discussionTaskIds = res[1].map(function(disc) {
                return disc.discussionTaskId;
            });
            return tools.Promise.all(response.map(function (pub) {
                if (pub.discussionTasks) {
                    return tools.Promise.all(pub.discussionTasks.map(function (discussion) {
                        if (discussionTaskIds.indexOf(discussion._id) === -1) {
                            return Discussion.initDiscussion({
                                locator: discussion.locator,
                                topic: discussion.topic,
                                description: discussion.description,
                                classId: studyClass.classId,
                                bookId: pub.id,
                                createdAt: Date.now(),
                                discussionTaskId: discussion._id
                            });
                        }
                        return tools.Promise.resolve();
                    }));
                }
                return tools.Promise.resolve();
            }));
        });
    }

    function cancel(req) {
        return StudyClass.cancel(req.classId, req.comment);
    }

    function invite(req) {
        return StudyClass.invite(req.classId, req.userIds, req.comment, req.reqParams);
    }

    function searchStudentsForClass(req) {
        return StudyClass.searchStudentsForClass(req.classId, req.filter, req.itemsCount);
    }

    function setStudentStatus(req) {
        //userId, classId,studentIds,status,comment
        return StudyClass.setStudentStatus(req.userId, req.classId, req.studentIds, req.status, req.comment, req.reqParams);
    }

    function searchByPublication(req) {
        return StudyClass.searchByPublication(req.publicationId, req.filter, req.itemsCount);
    }

    function searchTeachers(req) {
        return StudyClass.searchTeachers(req.classId, req.filter, req.itemsCount);
    }

    function setTeacherStatus(req) {
        return StudyClass.setTeacherStatus(/*req.userId, */req.classId, req.teacherIds, req.status, req.comment, req.reqParams);
    }

});
