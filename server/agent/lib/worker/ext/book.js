"use strict";
const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');
const publicDb = nano.use(names.public());
const idGenerator = require('../../util/id-generator');
const error = require('../../util/error-handler');

const pubFields = ['notes', 'bookmarks', 'tags', 'comments', 'discussionTasks', 'paraSize', 'quizzes', 'essays'];

function Book() {
	const self = this;

	self.execute = (data)=>{
		if (data.type === 'StudyCourseItem') {
			return setSyllabusItems(data);
		}

		if (data.type === 'Material') {
			return createMaterials(data);
		}

		if (data.type === 'studyGuideEditor') {
			return setStudyGuideEditor(data);
		}

		if (data.type === 'Test') {
			return self.addQuiz(data);
		}
		if (data.type === 'FlashcardStudy') {
			return self.addQuestion(data);
		}
		if (data.type === 'EssayTask') {
			return self.addEssay(data);
		}

		return publicDb.get(getBookId(data))
			.catch(error.notFoundOk)
			.then((res)=>{
				var out = getData(data, res);
				out._rev = res._rev;

				return publicDb.insert(out);
			});
	};

	function getData(obj, prevRes) {
		if (obj.type === 'StudyGuide') {
			return getStudyGuideData(obj, prevRes);
		}

		if (obj.type === 'Book') {
			return getBookData(obj);
		}

		if (obj.type === 'Supplemental') {
			return getBookData(obj);
		}

		if (obj.type === 'Collection') {
			return getCollectionData(obj);
		}

		if (obj.type === 'StudyCourse') {
			return getSyllabusData(obj, prevRes);
		}
	}

	function getBookData(book) {
		const data = getCommonData(book);
		data.pubType = 'book';
		data.distribution.collection = {
			parent: book.collection,
			contains: undefined,
			totalWordsCount: undefined,
			topDifficulty: undefined
		};
		data.content.wordsCount = book.wordsCount;
		data.content.difficulty = book.difficulty;

		return data;
	}

	function getScope(input) {
		if (input.type === 'Book') {
			//TODO change after other types will be implemented
			return 'public';
		}
		if (input.type === 'Supplemental') {
			return 'supplemental';
		}
	}

	function getCollectionData(collection) {
		var data = getCommonData(collection);
		data.pubType = 'collection';

		return data;
	}

	function getAuthors(input) {
		return input.split(',').map(function(s) {return s.trim();});
	}

	function getStudyGuideData(study, prevRes) {
		var out = getBookData(study);

		out.pubType = 'notes';

		out.content.exercises = {
			microJournaling: study.exercises && study.exercises.microJournaling
		};

		var prevContent = prevRes.content || {};
		pubFields.forEach((f) =>{
			out.content[f] = prevContent[f];
		});

		//move as is
		out.content.bookId = study.bookId;
		out.content.userIds = study.userIds;

		return out;
	}

	function getCommonData(data) {
		return {
			_id: getBookId(data),
			type: 'publication',
			distribution:{
				scope: getScope(data),
				collection: {
					parent: undefined,
					contains: data.items || [],
					totalWordsCount: data.wordsCount,
					topDifficulty: data.difficulty
				},
				commercial: {
					price: undefined,
					publisher: undefined
				},
				default: undefined,
				version: undefined,
				defaultNotes: undefined
			},
			content: {
				title: data.name,
				subtitle: undefined,
				authors: getAuthors(data.author),
				shorttitle: undefined,
				acronym: undefined,
				additional: undefined,
				cover: data.cover,
				wordsCount: undefined,
				difficulty: undefined,
				language: data.language,
				sectionType: undefined,
				weight: data.weight,
				publisher: undefined,
				publishedSource: undefined,
				originalId: data._id,
				translator: undefined,
				authorEnglish: undefined,
				titleEnglish: undefined,

				category: data.category,
				description: data.description,
				readingTime: data.readingTime,
				priority: data.priority,
				status: data.status,

				//book specific
				paraCount: data.paraCount,
				totalSize: data.totalSize,
				mediaSize: data.mediaSize,
				bookSize: data.bookSize,
				toc: data.toc,
				audio: data.audio,
				bitRate: data.bitRate,
				wordsPerMinute: data.wordsPerMinute,
				audioNarrator: data.audioNarrator,
				audioSource: data.audioSource,
				version: data.version
			},
			files: [],
			fileAccess: {}
		};
	}

	function getSyllabusData(syllabus, prev) {
		const data = getCommonData(syllabus);
		data.pubType = 'syllabus';

		if (prev._id) {
			data.distribution.collection.contains = prev.distribution.collection.contains;
			var prevContent = prev.content || {};
			pubFields.forEach((f) =>{
				data.content[f] = prevContent[f];
			});
		}

		return data;
	}

	function setSyllabusItems(data) {
		return publicDb.get(idGenerator.book(data.publicationId))
			.catch(()=>{
				return error.bad('Cannot set syllabus items for syllabus ' + idGenerator.book(data.publicationId) + ' (does not exist)');
			})
			.then((res)=>{
				res.distribution.collection.contains = data.studyCourseItems;
				return publicDb.insert(res);
			});
	}

    function createMaterials(material) {
        if (!material.editor) {
            return Promise.resolve('Processing user Material in user worker...');
        }
        const pubId = idGenerator.book(material.bookId);
        return publicDb.get(pubId)
            .catch(error.notFound(pubId))
            .then((res)=>{
                res.content.notes = material.annotations || [];
                res.content.bookmarks = material.bookmarks || [];
                res.content.tags = material.categories || [];
                res.content.comments = material.comments || [];
                res.content.discussionTasks = material.discussionTasks || [];
				res.content.paraSize = material.paraSize || '';

				res.content.discussionTasks.forEach(t=>{
					delete t.studyGuide;
					delete t.type;
				});
				res.content.comments.forEach(t=>{
					delete t.studyGuide;
				});
				res.content.bookmarks.forEach(t=>{
					delete t.studyGuide;
				});
				res.content.notes.forEach(t=>{
					delete t.studyGuide;
				});

                return publicDb.insert(res);
            })
			.then(()=>{
				if (material.discussionTasks && material.discussionTasks.length) {
					const taskIds = material.discussionTasks.map(t=>{return t._id}); //jshint ignore:line
					return publicDb.list({startkey: 'course', endkey: 'course' + '\uffff', include_docs: true}) //jshint ignore:line
						.then(res=>{
							return res.rows
								.map(r=>{
									return r.doc;
								})
								.filter(c=>{
									return c.publicationId === material.bookId;
								}).map((c)=>{
									return nano.use(names.course(c.classId)).list({startkey: 'discussion', endkey: 'discussion' + '\uffff', include_docs: true})  //jshint ignore:line
										.catch(()=>{
											//no db
											return Promise.reject('no course db ' + names.course(c.classId));
										})
										.then(doc=>{
											return Promise.all(doc.rows.map(d=>{
												if (taskIds.indexOf(d.doc.discussionTaskId) > -1) {
													const discussion = d.doc;
													const task = material.discussionTasks.filter((dt)=>{
														return dt._id === discussion.discussionTaskId;  //jshint ignore:line
													})[0];
													discussion.topic = task.topic;
													discussion.locator = task.locator;
													discussion.modifiedAt = task.modifiedAt;

													return nano.use(names.course(c.classId)).insert(discussion);
												}
												return Promise.resolve();
											}));
										});
								});
						});
				}
				return null;
			});
    }

	function setStudyGuideEditor(data) {
		const pubId = idGenerator.book(data.studyGuideId);
		return publicDb.get(pubId)
			.catch(error.notFound(pubId))
			.then((res)=>{
				res.content.editors = res.content.editors || {};

				const editor = res.content.editors[data.editorId] || {};
				res.content.editors[data.editorId] = editor;

				editor.status = data.status;
				editor.registeredAt = data.registeredAt;
				editor.modifiedAt = data.modifiedAt;
				editor.actions = data.StudyGuideEditorActions;

				return publicDb.insert(res);
			});
	}

	function getBookId(book) {
		return idGenerator.book(book._id);
	}

	self.addQuiz = (data)=>{
		const pubId = idGenerator.book(data.publicationId);
		return publicDb.get(pubId)
			.catch(error.notFound(pubId))
			.then((res)=>{
				res.content.quizzes = res.content.quizzes || [];
				const quiz = findItem(res.content.quizzes, '_id', data._id);

				quiz._id = data._id;
				quiz.createdAt = data.createdAt;
				quiz.description = data.description;
				quiz.locator = data.locator;
				quiz.modifiedAt = data.modifiedAt;
				quiz.name = data.name;
				quiz.questions = quiz.questions || [];
				quiz.type = data.testType;

				return publicDb.insert(res);
			})
			.then(()=>{
				return nano.use(names.quiz()).get(data._id)
					.catch(error.notFoundOk)
					.then((quiz)=>{
						quiz._id = data._id;
						quiz.publicationId = data.publicationId;

						return nano.use(names.quiz()).insert(quiz);
					});
			});
	};

	self.addQuestion = (data)=>{
		if (!data.testId) {
			return Promise.resolve('Processing FlashcardStudy in user worker...');
		}
		return nano.use(names.quiz()).get(data.testId)
			.catch(error.notFound(data.testId))
			.then((res)=>{
				return publicDb.get(idGenerator.book(res.publicationId))
					.then((book)=>{
						const quiz = findItem(book.content.quizzes, '_id', data.testId);

						quiz.questions = quiz.questions || [];

						var bookPromise = Promise.resolve();
						if (quiz.questions.indexOf(data._id) === -1) {
							quiz.questions.push(data._id);

							bookPromise = publicDb.insert(book);
						}

						return bookPromise
							.then(()=>{
								const id = idGenerator.question(data._id);
								return nano.use(names.query()).get(id)
									.catch(()=>error.notFoundOk)
									.then((question)=>{
										return nano.use(names.query()).insert({
											_id : id,
											_rev: question._rev,
											id : data._id,
											answer : data.answer,
											incorrectAnswers : data.incorrectAnswers,
											image: data.image,
											audio: data.audio,
											question : data.question,
											testId : data.testId,
											type: 'question'
										});
									});
							});
					});
			});
	};


	self.addEssay = (data)=>{
		const pubId = idGenerator.book(data.publicationId);
		return publicDb.get(pubId)
			.catch(error.notFound(pubId))
			.then((res)=>{
				res.content.essays = res.content.essays || [];
				const task = findItem(res.content.essays, '_id', data._id);

				task._id = data._id;
				task.createdAt = data.createdAt;
				task.comment = data.comment;
				task.locator = data.locator;
				task.modifiedAt = data.modifiedAt;
				task.topic = data.topic;
				task.wordsLimit = data.wordsLimit;

				return publicDb.insert(res);
			});
	};


	function findItem(array, property, value) {
		let idx = array.map((obj)=>{return obj[property];}).indexOf(value);

		if (idx === -1) {
			idx = array.push({}) - 1;
		}

		return array[idx];
	}
}

module.exports = Book;