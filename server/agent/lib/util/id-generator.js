function Generator() {
    "use strict";
    const self = this;

    // not implemented types are commented
    const types = {
        // 'pub-'      : 'book',
        'course'   : 'StudyClass',
        // 'user-'     : 'user',
        // // 'pub-' : 'book', // TODO: bookCourse - quite complicated
        // 'activity-' : 'activity',
        'usernotes': 'usernotes',
        // 'tags-'     : 'tags',
        // 'discussion-' : 'discussion',
        'message' : 'message',
    };

    self.book = (id)=>{
        return 'pub-' + id;
    };

    self.course = (id)=>{
        return 'course-' + id;
    };

    self.user = (id)=>{
        return 'user-' + id;
    };

    self.bookCourse = (bookId, courseId)=>{
        return this.book(bookId) + '-' + this.course(courseId);
    };

    self.activity = (bookId, courseId, userId)=>{
        return 'activity-' + this.book(bookId) + '-' + this.course(courseId) + '-' + this.user(userId);
    };

    self.usernotes = (pubId, courseId)=>{
        return 'usernotes-' + pubId + '-' + (courseId || 'userdefault');
    };

    self.tags = (pubId, courseId)=>{
        return 'tags-' + pubId + '-' + (courseId || 'userdefault');
    };

    self.discussion = (id)=>{
        return 'discussion-' + id;
    };

    self.message = (id)=>{
        return 'message-' + id;
    };

    self.question = (id)=>{
        return 'question-' + id;
    };

    // Try to detect type by id
    self.getType = id=>{
        // _id.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{8}/g)
        //if(id.startsWith())
        let temp = ("" + id).split('-');
        if(temp && types[temp[0]]){
            return types[temp[0]];
        }
        else{
            return null;
        }
    };
}

module.exports = new Generator();