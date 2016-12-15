define([
    './DB',
    './UserStudy',
    './Publication',
    './StudyCourse',
    './User',
    './Message',
    '../tools',
    'underscore',
    'Context'
], function(DB, UserStudy, Publication, StudyCourse, User, Message, tools, _, Context) {
    "use strict";

    var prefix = DB.prefix.course + '-';

    function getStatus() {
        return getProperty('membershipStatus');
    }

    function getProperty(prop) {
        return tools.getValue(Context.parameters.studyProjectConfig, prop);
    }

    function getUserRoles() {
        return getProperty('userRoleInStudyClass');
    }

    function getActionTypes(role) {
        return getProperty('class' + role + 'ActionTypeEnum');
    }

    function _prefix(id) {
        if (!("" + id).startsWith(prefix)) {
            id = prefix + id;
        }
        return id;
    }

    function _unprefix(id) {
        if (("" + id).startsWith(prefix)) {
            id = id.substr(prefix.length);
        }
        return id;
    }


    //TODO move logic to the controller and the agent
    return {
        getById: getById,
        getByIds: getByIds,
        getAll: getAll,
        info: info,
        persist: save,
        save: save,
        searchStudents: searchStudents,
        cancel: cancel,
        invite: invite,
        searchStudentsForClass: searchStudentsForClass,
        setStudentStatus: setStudentStatus,
        searchByPublication: searchByPublication,
        searchTeachers: searchTeachers,
        setTeacherStatus: setTeacherStatus
    };
    /////////////////////////////////////////


    /**
     * Get empty record.
     * Basically, this method should define data structure
     * @return {[type]} [description]
     */
    function _getEmptyRecord(doc, owner) {
      var now = Date.now();

      return Publication.getById(doc.publicationId).then(function(pub) {
          var result = {
              // system attributes
              _id: _prefix(doc.classId),
              type: 'StudyClass',

              // legacy attributes
              classId: doc.classId,
              publicationId: pub.id || doc.publicationId,
              publicationType: pub.type || doc.publicationType,
              registeredAt: now,
              modifiedAt: now,
              classType: 'Official',
              name: 'New Study Project', // publication.title,
              description: "This Project was created for studying " + (pub.name || ""),
              /* TODO clarify */
              studyWeekDays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              allowDiscussions: true,
              expectedDuration: 1800000, // TODO clarify
              //joinEndDate: Math.floor(now / 100000) * 100000,
              //scheduledAt: Math.floor(now / 100000) * 100000,
              /* TODO clarify */
              cover: null, // TODO: ?

              // modern attributes
              students: {},
              teachers: {},
              status: getProperty('studyClassStatus.active') // TODO: depends on type?
          };
          result.teachers[owner.id] = {
              registeredAt: now,
              modifiedAt: now,
              active: true,
              //TODO  result.teachers.actions
              actions: [{
                  performedAt: now,
                  actionType: getActionTypes('Teacher').classWasCreatedByTeacher,
                  comment: ''
              }]
          };
          return result;
      });
   }




   /**
    * [getById description]
    * @ param  {[type]} courseId [description]
    * @return {[type]}          [description]
    */
   function getById(courseId) {
        return _getDocs(courseId)
            .then(function(data) {
                // TODO: getById: this is very simple merge logic
                var doc = tools.diff.apply(data[1], data[0], tools.diff.resolve.original);
                if (!data[1]) {
                    // will create a new record in userRW
                    delete doc._rev;
                }
                return doc;
            });
    }


    /**
     * get unmerged docs from public and user db
     * @ param  {string} courseId course id
     * @return {array}          0 - from public, 1 - from user
     */
    function _getDocs(courseId) {
       var id = _prefix(courseId);
       return tools.Promise.all([
            DB.query().byId(id)
            .catch(function( /*err*/ ) {
                return null;
            }),
            DB.userRW().get(id)
            .catch(function( /*err*/ ) {
               return null;
           })
        ]).then(function(data) {
            if (!data[0] && !data[1]) {
                throw tools.pouch.notFound(courseId);
            }
            else {
                return data;
            }
         });
   }
   /**
    * [_getAll description]
     * @param  {[array]} studyIds (optional) array of study ids
     * @param {String} [viewName] get by viewName
     * @param {String} [keys] view keys
     * @return {[Promise]}     study classes
    */
    function _getAll(studyIds, viewName, keys) {
        viewName = viewName || "courseByUser";
        var ids = (studyIds && studyIds.length) ? studyIds.map(_prefix) : null;
        return tools.Promise.all([
                ids ? DB.query().byIds(ids) : User.getCurrentUser().then(function(user) {
                    keys = keys || [user.id];
                    return DB.query().byView(DB.prefix.course, viewName, keys);
                }),

                ids ? DB.userRW().getAll({keys: ids}) : DB.userRW().getAllByPrefix(DB.prefix.course)
            ]).then(function(data) {
                return _mergeStudyClasses(data[0], data[1]);
            }).then(function(data) {
                return data.filter(function(cl) {
                    return cl.type === 'StudyClass';
                });
            }).catch(function( /*err*/ ) {
                return [];
            });
    }

    /**
     * userDoc should be some sort of diff, actually - full record
     */
    function _mergeStudyClasses(publicDocs, userDocs) {

        // join arrays
        // concat order is very important here!
        var courses = publicDocs.concat(userDocs);
        var result = courses.reduce(function(result, item) {
            if (!result[item._id]) {
                result[item._id] = item;
            }
            else {
                result[item._id] = tools.diff.apply(item, result[item._id], tools.diff.original);
            }
            return result;
        }, {});

        // transform object to array
        return Object.keys(result).map(function(item) {
                return result[item];
        });
    }



    //
    function save(studyClass) {
        return _saveDiff(studyClass);
    }


   /**
    * create/update study class
     * @param  {object} doc   [description]
    * @return complete promise
    */
    function _saveDiff(doc) {
        var studyId = doc.classId || doc._id || DB.id.course();

        return _getDocs(studyId)
            .catch(function() {
                // get empty if not found
                return User.getCurrentUser().then(function(user) {
                    return tools.Promise.all([tools.Promise.resolve(null), _getEmptyRecord(doc, user)]);
                });
            })
            .then(function(data) {
                var docPublic = data[0];
                var docUser = data[1];

                // first: calculate new diff
                var diff = tools.diff.diff(doc, docPublic);
                // last: merge diff with previous one!
                diff = tools.diff.joinPatches(diff, docUser);

                if (!doc.scheduledAt || !doc.joinEndDate) {
                    diff.scheduledAt = diff.joinEndDate = "";
                }

                // forbid to change some fields
                // diff._id = docUser ? docUser._id : docPublic._id;
                diff._id = _prefix(studyId);
                // diff.classId = docUser.classId;
                if (docUser) {
                    diff._rev = docUser._rev;
                }
                diff.type = 'StudyClass';

                return DB.userRW().put(diff);
       });
   }


    //tab Study + personal messages
    function getAll(classIds) {
        return _getAll(classIds)
        .then(function(classes) {
            return classes.filter(function(cls) {
                //filter full documents
                return cls.teachers && cls.students;
            });
        })
        .then(function(classes) {
            return tools.Promise.all(classes.map(function(cls) {
                return convertStudyClass(cls).catch(function(/*e*/){
                    // TODO: too often it crashes here :(
                    // throw e;
                    return null;    // return null instead of throwing an error allows to proceed
                });
            }));
        })
        .then(function(studyClasses) {
            var outdatedCourses = [];
            var classes = studyClasses.filter(function(sc) {
                var active = sc && sc.class && sc.class.status !== getProperty('studyClassStatus.cancelled');
                if (!active) {
                    var classId = sc && sc.class && sc.class.classId;
                    if (classId) {
                        DB.destroyLocalDB(DB.name.course(classId));
                        outdatedCourses.push(classId);
                    }
                }
                return active && sc.role;
            });

            UserStudy.clearActivity(outdatedCourses);

            return classes;
        });
    }


    //search
    function convertStudyClass(data) {
        return tools.Promise.all([
                Publication.getById(data.publicationId, data.classId),
                User.getCurrentUser(),
                User.getByIds(getActiveTeachers(data))
                // UserStudy.getPublicationSummary(data.classId)
            ])
            .then(function(res) {
                var pub = res[0];
                var user = res[1];
                var teachers = res[2];
                // var activity = res[3];

                return {
                    "class": getClassInfo(data, pub),
                    "course": {
                        "id": pub._id,
                        "publicationType": pub.publicationType,
                        "name": pub.name,
                        "author": pub.author,
                        "description": pub.description,
                        "cover": pub.cover,
                        "categories": [pub.category],
                        "audio": pub.mediaSize !== 0,
                        "wordsNumber": pub.wordsCount,
                        "readingTime": pub.readingTime,
                        "difficulty": pub.difficulty
                    },
                    "membership": setMembers(data),
                    "role": getRoleInfo(data, user),
                    "teachers": getTeachers(teachers, data, user)
                };
            });
    }

    function getClassInfo(data, pub) {
        return {
            "_id": data.classId,
            "classId": data.classId,
            "publicationId": data.publicationId,
            "publicationType": data.publicationType,
            "registeredAt": data.registeredAt,
            "classType": data.classType,
            "name": data.name,
            "description": data.description,
            "scheduledAt": data.scheduledAt || undefined,
            "expectedDailyWork": data.expectedDailyWork,
            "joinEndDate": data.joinEndDate || undefined,
            "studyWeekDays": data.studyWeekDays,
            "allowDiscussions": data.allowDiscussions,
            "cover": data.cover,
            "modifiedAt": data.modifiedAt,
            "status": data.status,
            "readingProgress": pub.readingProgress
        };
    }

    function setMembers(data) {
        return Object.keys(data.students)
            .map(function(id) {
                var student = data.students[id];
                if ((student.confirmationStatus === getStatus().accepted ||
                    student.confirmationStatus === getStatus().requested) &&
                    student.teacherConfirmationStatus === getStatus().accepted) {

                    return {
                        classId: data.classId,
                        modifiedAt: student.modifiedAt,
                        registeredAt: student.registeredAt,
                        studentConfirmationStatus: student.confirmationStatus,
                        studentId: id,
                        studyId: student.studyId || "",
                        teacherConfirmationStatus: student.teacherConfirmationStatus
                    };
                }
            })
            .filter(Boolean);
    }

    function getTeachers(teachers, data, user) {
        if (!teachers.length && data.teachers[user.id]) {
            teachers.push(user);
        }
        return teachers.map(function(teacher) {
            var action = data.teachers[teacher.userId] &&
                data.teachers[teacher.userId].actions[0] &&
                data.teachers[teacher.userId].actions[0].actionType;
            return {
                "email": teacher.email[0],
                "lastName": teacher.lastName,
                "firstName": teacher.firstName,
                "userId": teacher.userId,
                "photo": teacher.photo,
                "role": (action === getActionTypes('Teacher').classWasCreatedByTeacher || !action) ?
                    getUserRoles().teacher : getUserRoles().teacherAndStudent
            };
        });
    }

    //used for recent items
    function getByIds(studyIds) {
        return tools.Promise.all([
                _getAll(studyIds),
                UserStudy.getPublicationsSummary(studyIds)
            ])
            .then(function(data) {
                var courses = data[0];
                return tools.Promise.all(courses.map(function(course) {
                    return convertData(course, data[1][course.classId]);
                }).filter(Boolean));
            });
    }

    //used for recent items
    function convertData(course, courseSummary) {
        if (!courseSummary) {
            return null;
        }
        return tools.Promise.all([
                User.getByIds(getActiveTeachers(course)),
                Publication.getById(course.publicationId)
            ])
            .then(function(res) {
                var pub = res[1];
                return {
                    //classType?

                    _id: course.classId,
                    author: getTeachersInfo(res[0]),
                    allowDiscussions: course.allowDiscussions,
                    classId: course.classId,
                    cover: course.cover,
                    currentStudyItem: courseSummary.currentItemId,
                    currentStudyItemId: course.publicationId,
                    difficulty: null, // TODO always empty in current scheme
                    lastReadingTime: courseSummary.lastOpenedAt,
                    readingTime: pub.readingTime,
                    name: course.name,
                    participant: Object.keys(course.students || {}).length,
                    progress: courseSummary.readingProgress || 0,
                    progressNum: courseSummary.readingProgress ? Math.floor(courseSummary.readingProgress / 15) : 0,
                    publicationType: course.publicationType,
                    type: course.type,
                    status: course.status
                };
            });
    }

    function getActiveTeachers(course) {
        return Object.keys(course.teachers)
            .filter(function(id) {
                return course.teachers[id].active;
            });
    }

    function info(classId) {
        return getById(classId)
            .then(function(data) {
                return tools.Promise.all([
                    Publication.getById(data.publicationId, data.classId),
                    User.getCurrentUser(),
                    User.getByIds(getActiveTeachers(data))
                ])
                .then(function(res) {
                    var pub = res[0];
                    var items = pub.items && pub.items.length ? StudyCourse.get(data.publicationId) : tools.Promise.resolve([]); //syllabus
                    var bookInfo = pub.bookId ? Publication.getById(pub.bookId) : tools.Promise.resolve({}); //book notes

                    res.push(items, bookInfo);
                    return tools.Promise.all(res);
                })
                .then(function(res) {
                    var pub = res[0];
                    var user = res[1];
                    var teachers = res[2];
                    var items = res[3];
                    var bookInfo = res[4];

                    return {
                        "teachers": getTeachers(teachers, data, user),
                        "userRole": getRoleInfo(data, user),
                        "summary": getSummaryInfo(data.students),
                        "class": getClassInfo(data, pub),
                        "studyCourseInfo": {
                            "details": items.studyCourseItems || [], //getCourseItemsInfo(items, pub),
                            "course": {
                                "_id": pub._id,
                                "bookId": pub.bookId,
                                "name": pub.name,
                                "author": pub.author,
                                "description": pub.description,
                                "category": pub.category,
                                "wordsCount": pub.wordsCount,
                                "readingTime": pub.readingTime,
                                "difficulty": pub.difficulty,
                                "type": pub.publicationType,
                                "audio": pub.audio,
                                "cover": pub.cover,
                                "mediaSize": pub.mediaSize,
                                "bookAuthor": bookInfo.author,
                                "bookCover": bookInfo.cover,
                                "bookName": bookInfo.name
                            }
                        }
                    };
                });
            });
    }

    function getRoleInfo(data, user) {
        if (data.teachers[user.id] !== undefined) {
            return getUserRoles().teacher;
        }

        var userStudent = data.students[user.id];

        if (userStudent) {
            if (userStudent.confirmationStatus === getStatus().accepted &&
                userStudent.teacherConfirmationStatus === getStatus().accepted) {
                return getUserRoles().student;
            }
            else if (userStudent.confirmationStatus === getStatus().requested &&
                userStudent.teacherConfirmationStatus === getStatus().accepted) {
                return 'Invited student';
            }
            else if (userStudent.confirmationStatus === getStatus().accepted &&
                userStudent.teacherConfirmationStatus === getStatus().requested) {
                return 'Requested student';
            }
        }
        else {
            return undefined;
        }
    }



    function getSummaryInfo(students) {
        var total = 0;
        var invited = 0;
        var requested = 0;


        Object.keys(students).forEach(function(id) {
            var studentInfo = students[id];
            if (studentInfo.confirmationStatus === getStatus().accepted &&
                studentInfo.teacherConfirmationStatus === getStatus().accepted) {
                total++;
            }
            else if (studentInfo.confirmationStatus === getStatus().requested &&
                studentInfo.teacherConfirmationStatus === getStatus().accepted) {
                invited++;
            }
            else if (studentInfo.confirmationStatus === getStatus().accepted &&
                studentInfo.teacherConfirmationStatus === getStatus().requested) {
                requested++;
            }
        });

        return {
            "numberOfStudents": total,
            "numberOfInvitedStudents": invited,
            "numberOfRequestedStudents": requested
        };
    }

    function searchStudents(classId, filter, itemsCount) {
        return getById(classId)
            .then(function(course) {
                return course.students;
            })
            .then(function(students) {
                var studentIds = Object.keys(students || {});
                return User.getByIds(studentIds)
                    .then(function(usersInfo) {
                        return usersInfo.map(function(user) {
                            var student = students[user.userId] || {};
                            return {
                                "registeredAt"              : student.registeredAt,
                                "modifiedAt"                : student.modifiedAt,
                                "teacherConfirmationStatus" : student.teacherConfirmationStatus,
                                "studentConfirmationStatus" : student.confirmationStatus,
                                "userId"                    : user.userId,
                                "email"                     : user.email[0],
                                "lastName"                  : user.lastName,
                                "firstName"                 : user.firstName,
                                "photo"                     : user.photo && user.photo.fileHash,
                                "photoLink"                 : user.photoLink
                            };
                        });
                    })
                    .then(function(students) {

                        return students.filter(function(student) {
                            return (student.lastName.toLowerCase().indexOf(filter) !== -1 ||
                                student.firstName.toLowerCase().indexOf(filter) !== -1 ||
                                student.email.indexOf(filter) !== -1) &&

                                ((student.teacherConfirmationStatus === getStatus().accepted ||
                                student.teacherConfirmationStatus === getStatus().requested) &&

                                (student.studentConfirmationStatus === getStatus().accepted ||
                                student.studentConfirmationStatus === getStatus().requested));
                        });
                    })
                    .then(tools.slice(itemsCount));
            });
    }

    function cancel(classId, comment) {
        return getById(classId)
            .then(function(doc) {
                doc.status = getProperty('studyClassStatus.cancelled');
                return _saveDiff(doc);
            })
            .then(function() {
                return DB.destroyLocalDB(DB.name.course(classId));
            })
            .then(function() {
                return searchStudentsForClass(classId)
                    .then(function(students) {
                        var studentIds = [];
                        if (students && students.length !== 0) {
                            students.forEach(function (student) {
                                if (student.alreadyInClass) {
                                    studentIds.push(student.userId);
                                }
                            });
                        }

                        return Message.persist({
                            recipientIds: studentIds,
                            text: comment,
                            subject: 'Course Cancelled',
                            extendMessageParams: {
                                classId : classId
                            }
                        });
                    });
            });
    }

    function invite(classId, userIds, comment, reqParams) {
        return tools.Promise.all([
                getById(classId),
                User.getCurrentUser()
            ])
            .then(function(res) {
                var course = res[0];
                var user = res[1];
                var teacherIds = Object.keys(course.teachers || {});
                var recipientIds = [];
                var updatedStudents = [];
                var curDate = new Date().getTime();

                var userRole = getUserRoles()[course.teachers[user.id] ? 'teacher' : 'student'];
                var studentDefaultStatus = getStudentStatus(course, curDate, userRole, comment);

                _.each(userIds, function(studentId) {
                    var student = {};
                    if (course.students[studentId]) {
                        student = course.students[studentId];
                        studentDefaultStatus.actions = persistStudentActions(student.actions, studentDefaultStatus.actions);
                        student = _.extend(student, studentDefaultStatus);
                    }
                    else {
                        student = _.extend(studentDefaultStatus, {
                            registeredAt: curDate,
                            modifiedAt: curDate
                        });
                        course.students[studentId] = student;
                    }

                    if (student.confirmationStatus === getStatus().requested) {
                        recipientIds.push(studentId);
                    }
                    else if (student.teacherConfirmationStatus === getStatus().requested) {
                        recipientIds = teacherIds;
                    }
                    sendEmailInvite(recipientIds, course, teacherIds, reqParams);

                    updatedStudents.push(student);
                });
                if (updatedStudents.length !== 0) {
                    var promise = _saveDiff({
                        _id: course._id,
                        students: course.students
                    });
                    if (recipientIds.length !== 0 && userRole === getUserRoles().teacher) {
                        return promise.then(function() {
                            return Message.persist({
                                recipientIds: recipientIds,
                                text: comment,
                                subject: 'Invite', //TODO clarify text
                                extendMessageParams: {
                                    classId: classId,
                                    type: 'ClassNotificationMessage'
                                }
                            });
                        });
                    }
                    else {
                        return promise;
                    }
                }
            });
    }

    //TODO used in createByClassId, move to agent
    function sendEmailInvite(recipients, course, teacherIds, reqParams) {
        return User.getByIds(teacherIds)
            .then(function(teacherProfiles) {
                var emailInfoParams = {
                    emailTitleSuffix: '“' + course.name + '”',
                    courseName: course.name,
                    teacher: '',
                    link: '',
                    startDate: ''
                };
                emailInfoParams.startDate = getStartDate(course.scheduledAt);
                //TODO check
                emailInfoParams.teacher = getTeachersInfo(teacherProfiles);
                emailInfoParams.isJoinEndDate = !!course.joinEndDate;

                DB.userRW().createTask(
                    {
                        recipientIds: recipients,
                        inviteContext: course,
                        emailInfoParams: emailInfoParams,
                        lang: 'en',
                        reqParams: reqParams
                    }, 'external-send');
            });
    }

    function getTeachersInfo(teachers) {
        return (teachers || []).map(function(info) {return info.firstName + ' ' + info.lastName;}).join(', ');
    }

    //from studyclass
    function getStartDate(startDateMs) {
        var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var startDate = new Date(startDateMs);
        var month = monthNames[startDate.getMonth()];
        var day = startDate.getDate() > 10 ? startDate.getDate() : '0' + startDate.getDate();
        return month + '. ' + day + ', ' + startDate.getFullYear();
    }

    function persistStudentActions(studentActions, currentActions) {
        //update
        var position;
        studentActions = _.sortBy(_.map(studentActions, function(action) {
            if (action.actionType === currentActions[0].actionType) {
                action.performedAt = currentActions[0].performedAt;
                action.comment = currentActions[0].comment;
            }
            return action;
        }), function(action) {
            return action.performedAt;
        });
        //create
        position = studentActions.length - 1 >= 0 ? studentActions.length - 1 : 0;
        if (studentActions[position].actionType !== currentActions[0].actionType) {
            studentActions.push(currentActions[0]);
        }
        if (currentActions.length !== 1) {
            currentActions.shift();
            return persistStudentActions(studentActions, currentActions);
        }
        else {
            return studentActions;
        }
    }

    function getStudentStatus(classView, date, userRole, comment) {
        var accepted = getProperty('membershipStatus.accepted'),
            requested = getProperty('membershipStatus.requested'),
            teacherAccept = getActionTypes('Student').classMembershipAcceptedByTeacher,
            studentAccept = getActionTypes('Student').classMembershipAcceptedByStudent,
            studentRequest = getActionTypes('Student').classMembershipRequestedByStudent,
            teacherRequest = getActionTypes('Student').classMembershipRequestedByTeacher,
            studentRole = getUserRoles().student,
            teacherRole = getUserRoles().teacher;
        var classTypes = {
            'Institutional': {
                teacherConfirmationStatus: accepted,
                confirmationStatus: accepted,
                actions: [{
                        actionType: teacherAccept
                }, {
                        actionType: studentAccept
                }]
            },
            'Public': {
                teacherConfirmationStatus: accepted,
                confirmationStatus: userRole === studentRole ? accepted : requested,
                actions: [{
                        actionType: userRole === teacherRole ? teacherAccept : studentAccept
                }, {
                        actionType: userRole === studentRole ? studentAccept : teacherRequest
                }]
            },
            'Moderated': {
                teacherConfirmationStatus: userRole === teacherRole ? accepted : requested,
                confirmationStatus: userRole === studentRole ? accepted : requested,
                actions: [{
                        actionType: userRole === teacherRole.teacher ? teacherAccept : studentAccept
                }, {
                        actionType: userRole === studentRole ? studentRequest : teacherRequest
                }]
            },
            'Private': {
                teacherConfirmationStatus: accepted,
                confirmationStatus: requested,
                actions: [{
                        actionType: teacherAccept
                }, {
                        actionType: teacherRequest
                }]
            },
            'Independent Study': {
                teacherConfirmationStatus: accepted,
                confirmationStatus: accepted,
                actions: [{
                        actionType: teacherAccept
                }, {
                        actionType: studentAccept
                }]
            }
        };

        var type = classTypes[classView.classType];
        type.modifiedAt = date + 1;
        type.actions[0].performedAt = date;
        type.actions[1].performedAt = date + 1;
        type.actions[0].comment = comment;
        type.actions[1].comment = comment;


        return type;
    }

    function searchStudentsForClass(classId, filter, itemsCount) {
        return tools.Promise.all([
                getById(classId),
                User.getCurrentUser(),
                User.getAll(true)
            ])
            .then(function(res) {
                var course = res[0];
                var curUser = res[1];
                var users = res[2];

                var studentIds = Object.keys(course.students)
                    .filter(function(id) {
                        return course.students[id].teacherConfirmationStatus === getStatus().accepted &&
                            [getStatus().accepted, getStatus().requested].indexOf(course.students[id].confirmationStatus) > -1;
                    });

                return users
                    .filter(filterUser(filter))
                    .map(function(user) {
                        return {
                            userId: user.userId,
                            email: user.email[0],
                            lastName: user.lastName,
                            firstName: user.firstName,
                            photo: user.photo,
                            alreadyInClass: studentIds.indexOf(user.userId) > -1 ||
                                            user.userId === curUser.id ||
                                            !!course.teachers[user.userId]//TODO: gshe
                        };
                    });
            })
            .then(tools.slice(itemsCount));
    }

    function setStudentStatus(userId, classId, studentIds, status, comment, reqParams) {
        return getById(classId)
            .then(function updateUsers(course) {
                var date = new Date().getTime(),
                    userRole;

                var currentUser = course.students[userId] || course.teachers[userId];

                var isStudent = course.students[userId] !== undefined;
                var isTeacher = course.teachers[userId] !== undefined;

                var students = _.map(studentIds, function (studentId) {
                    var student = course.students[studentId] || course.teachers[userId];
                    student.userId = studentId;
                    //if ( !student ) {

                    // update action
                    if (isStudent) {
                        userRole = getUserRoles().student;
                        student = _.extend(student, {
                            modifiedAt: date,
                            confirmationStatus: status
                        });
                    }
                    else if (isTeacher && currentUser.active) {
                        userRole = getUserRoles().teacher;
                        student = _.extend(student, {
                            modifiedAt: date,
                            teacherConfirmationStatus: status
                        });
                    }

                    var currentAction = {
                        performedAt : date,
                        comment     : comment,
                        actionType  : getCurrentActionType(status, userRole)
                    };

                    // update status
                    if ( currentAction.actionType ) {
                        student.actions = persistStudentActions(student.actions, [currentAction]);
                        if (userRole === getUserRoles().teacher &&
                            (student.teacherConfirmationStatus === getStatus().accepted ||
                            student.teacherConfirmationStatus === getStatus().blocked)
                        ) {
                            Message.persist({
                                recipientIds: [studentId],
                                text: '',
                                subject: student.teacherConfirmationStatus,
                                extendMessageParams: {
                                    classId: classId,
                                    type   : 'ClassNotificationMessage'
                                }
                            });
                        }
                        return student;
                    }
                    else {
                        //TODO error?
                        return null;
                    }
                });

                return save({_id: _unprefix(course._id), students: course.students})
                    .then(function() {
                        return tools.Promise.all([course, students]);
                    });
            })
            //TODO handle errors
            .then(function(res) {
                var course = res[0];
                var students = res[1];
                students.map(function(student) {
                    if (course.classType === 'Moderated' &&
                        student.confirmationStatus === getStatus().accepted &&
                        student.teacherConfirmationStatus === getStatus().accepted) {
                        var inviteContext = _.extend(course, student);

                        sendEmailInvite([student.userId], inviteContext, Object.keys(course.teachers), reqParams);
                    }
                });

                return {status: 'Success'};
            });
    }

    function getCurrentActionType(status, userRole) {//is this func needed?
        var actionTypeKeys = Object.keys(getActionTypes('Student'));
        var currentActionType = _.filter(actionTypeKeys, function (actionTypeKey) {
            if (actionTypeKey.indexOf(status) !== -1 && actionTypeKey.indexOf(userRole) !== -1) {
                return getActionTypes('Student')[actionTypeKey];
            }
            return false;
        });

        if (currentActionType.length === 1) {
            return getActionTypes('Student')[currentActionType[0]];
        }
        else {
            return false;
        }
    }

    function searchByPublication(publicationId, filter, itemsCount) {
        return Publication.getRelatedStudyGuides(publicationId)
            .then(function(publications) {
                return _getAll(null, 'courseByPublication', publications.map(function(pub) {
                    return pub._id;
                }));
            })
            .then(function(studyClasses) {
                filter = (filter || '').toLowerCase();
                return tools.Promise.all(
                    studyClasses
                        .filter(function filterClass(course) {
                            return (course.name || '').indexOf(filter) > -1;
                        })
                        .map(convertStudyClass)
                );
            })
            .then(function(classes) {
                return classes.filter(function(info) {
                    return info.role !== getUserRoles().teacher &&
                        (['Public', 'Moderated'].indexOf(info.class.classType) > -1);
                });
            })
            .then(tools.slice(itemsCount));
    }

    function searchTeachers(classId, filter, itemsCount) {
        return tools.Promise.all([
                getById(classId),
                User.getAll()
            ])
            .then(function(res) {
                var course = res[0];
                var users = res[1].filter(function(user) {
                    return user.status !== 'Declined';
                });

                return users.map(function(user) {
                    var activeUser = getBaseUserProfileView(user);
                    if (course.teachers[user.userId] && course.teachers[user.userId].active) {
                        var lastAction = _.last(course.teachers[user.userId].actions);
                        var alreadyInvited = lastAction.actionType === getActionTypes('Teacher').teacherWasAddedToClass ||
                            course.teachers[user.userId].actionType === getActionTypes('Teacher').classWasCreatedByTeacher ||
                            !course.teachers[user.userId].actionType;
                        var role = lastAction.actionType === getActionTypes('Teacher').teacherWasAddedToClass ?
                            getUserRoles().teacherAndStudent : getUserRoles().teacher;
                        return _.extend(activeUser, {
                            alreadyInvited: alreadyInvited,
                            role: role
                        });
                    }
                    else if (course.students[user.userId]) {
                        return _.extend(activeUser, {
                            role: getUserRoles().student
                        });
                    }
                    return activeUser;
                })
                .filter(filterUser(filter));
            })
            .then(tools.slice(itemsCount));
    }

    function setTeacherStatus(classId, teacherIds, status, comment, reqParams) {
        return getById(classId)
            .then(function(course) {
                var curDate = Date.now();

                _.each(teacherIds, function (id) {
                    var teacher = course.teachers[id],
                        student = course.students[id];

                    if (teacher) {
                        switch (status) {
                            case getStatus().declined:
                                if ( !student ) {
                                    course.students[id] = {
                                        registeredAt              : teacher.registeredAt,
                                        active                    : true,
                                        studentId                 : teacher.teacherId,
                                        teacherConfirmationStatus : getStatus().accepted,
                                        confirmationStatus : getStatus().accepted,
                                        actions : [{
                                            modifiedAt                : curDate + 1,
                                            teacherConfirmationStatus : getStatus().accepted,
                                            studentConfirmationStatus : getStatus().accepted
                                        }]
                                    };
                                }
                                else {
                                    student.confirmationStatus = getStatus().accepted;
                                    student.teacherConfirmationStatus = getStatus().accepted;
                                }
                                _updateTeacherData(teacher, getActionTypes('Teacher').teacherWasRemovedFromClass, curDate, comment, false);
                                break;
                            case getStatus().accepted:
                                _updateTeacherData(teacher, getActionTypes('Teacher').teacherWasAddedToClass, curDate, comment, true);
                                break;
                            default:
                                break;
                        }
                    }
                    else {
                        course.teachers[id] = {
                            studyId      : '',
                            registeredAt : curDate,
                            modifiedAt   : curDate,
                            active       : true,
                            actions: [
                                {//TODO
                                    performedAt : curDate,
                                    actionType  : getActionTypes('Teacher').teacherWasAddedToClass,
                                    comment     : ''
                                }
                            ]
                        };
                    }
                });

                var promises = [];

                if ( status !== getStatus().declined ) {
                    //TOOO move to the server messaging logic
                    var message = Message.persist({
                        recipientIds: teacherIds,
                        text: '',
                        subject: 'You were added to Course as Teacher'
                    });

                    var inviteContext = {
                        classId: course.classId,
                        name: course.name,
                        type: 'inviteTeacherToClass'
                    };
                    promises = [sendEmailInvite(teacherIds, inviteContext, teacherIds, reqParams), message];
                }

                promises.push(_saveDiff(course));

                return tools.Promise.all(promises);
            })
            .then(function() {
                return {
                    classId: classId
                };
            });
    }

    function _updateTeacherData (_user, _actionType, _date, _comment, _isActive) {
        _user.active     = _isActive;
        _user.modifiedAt = _date;
        _user.actions.push({
            performedAt : _date,
            actionType  : _actionType,
            comment     : _comment
        });
    }

    function getBaseUserProfileView(user) {
        return {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            photo: user.photo || ''
        };
    }

    function filterUser(filter) {
        if (!!filter) {
            return function(user) {
                return user.lastName.toLowerCase().indexOf(filter) === 0 ||
                    user.firstName.toLowerCase().indexOf(filter) === 0;
            };
        }
        return function() {
            return true;
        };
    }

});