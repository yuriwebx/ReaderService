"use strict";
/* jshint -W106 */

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');
const idGenerator = require('../../util/id-generator');
const error = require('../../util/error-handler');

const publicDb = nano.use(names.public());

function Course() {
    const self = this;

    self.execute = (data)=>{
        if (data.type === 'StudyClass') {
            return self.add(data);
        }
        if (data.type === 'ClassTeacher') {
            return self.setTeacher(data);
        }
        if (data.type === 'ClassStudent') {
            return self.setStudent(data);
        }
        if (data.type === 'ClassDiscussion') {
            return self.addDiscussion(data);
        }
        if (data.type === 'ClassDiscussionMessage') {
            return self.addDiscussionMessage(data);
        }
        return error.bad('Cannot process course.type ' + data.type);
    };

    self.add = (course)=>{
        const initialId = course._id;
        const courseId = idGenerator.course(initialId);
        return publicDb.get(courseId)
            .catch(error.notFoundOk)
            .then((res)=>{
                return publicDb.insert(getCourseData(course, res));
            })
            .then(()=>{
                return nano.db.create(names.course(initialId));
            });
    };

    function getCourseData(course, res) {
        course._id = idGenerator.course(course._id);
        course._rev = res._rev;
        course.teachers = res.teachers || {};
        course.students = res.students || {};

        return course;
    }

    self.setTeacher = (data)=>{
        const classId = idGenerator.course(data.classId);
        return publicDb.get(classId)
            .catch(error.notFound(classId))
            .then((res)=>{
                res.teachers = res.teachers || {};
                res.teachers[data.teacherId] = {
                    actions: data.classTeacherAction,
                    modifiedAt: data.modifiedAt,
                    registeredAt: data.registeredAt
                };

                return publicDb.insert(res);
            })
            .then(()=>{
                return nano.user.grant_access(names.course(data.classId), data.teacherId);
            });
    };

    self.setStudent = (data)=>{
        const classId = idGenerator.course(data.classId);
        return publicDb.get(classId)
            .catch(error.notFound(classId))
            .then((res)=>{
                res.students = res.students || {};
                res.students[data.studentId] = {
                    actions: data.classStudentAction,
                    confirmationStatus: data.studentConfirmationStatus,
                    teacherConfirmationStatus: data.teacherConfirmationStatus,
                    modifiedAt: data.modifiedAt,
                    registeredAt: data.registeredAt
                };

                return publicDb.insert(res);
            })
            .then(()=>{
                return nano.user.grant_access(names.course(data.classId), data.studentId);
            });
    };

    self.addDiscussion = (data)=>{
        return nano.db.get(names.course(data.classId))
            .catch(error.notFound(data.classId))
            .then(()=>{
                return nano.use(names.course(data.classId)).get(idGenerator.discussion(data._id));
            })
            .catch(error.notFoundOk)
            .then((res)=>{
                res._id = idGenerator.discussion(data._id);
                res.bookId = data.bookId;
                res.createdAt = data.createdAt;
                res.description = data.description;
                res.locator = data.locator;
                res.modifiedAt = data.modifiedAt;
                res.topic = data.topic;

                return nano.use(names.course(data.classId)).insert(res);
            })
            .then(()=>{
                return nano.use(names.discussion()).get(data._id)
                    .catch(error.notFoundOk)
                    .then((res)=>{
                        if (res.classId) {
                            return Promise.resolve();
                        }
                        res._id = data._id;
                        res.classId = data.classId;

                        return nano.use(names.discussion()).insert(res);
                    });
            });
    };

    self.addDiscussionMessage = (data)=>{
        return nano.use(names.discussion()).get(data.classDiscussionId)
            .catch(error.notFound(data.classDiscussionId))
            .then((res)=>{
                return nano.use(names.course(res.classId)).get(idGenerator.message(data._id))
                    .catch(error.notFoundOk)
                    .then((message)=>{
                        message._id = idGenerator.message(data._id);
                        message.createdAt = data.createdAt;
                        message.level = data.level;
                        message.parentMessageId = data.parentMessageId;
                        message.text = data.text;
                        message.userId = data.userId;

                        return nano.use(names.course(res.classId)).insert(message);
                    });
            });
    };
}

module.exports = Course;



