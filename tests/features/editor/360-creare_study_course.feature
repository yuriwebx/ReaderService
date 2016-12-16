Feature: Editor

Scenario: Create study course
	
	Given I select data area editor
	
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
#	When user clicks button CreateStudyCourseButton
	
	When I toggle menu ToggleMenu
	When I click item NewCourseSyllabus
	
	Then We should see new course NewStudyCourse
#	Then All categories category is selected by default in FilterBox
#	Given I introduce [FilterData] in FilterBox
	When user enters data [FilterData] in FilterBox
	Then FilteredBookList is shown according to [FilterData]
	When user deletes data in FilterBox
	Then FilteredBookList is shown not depending on [FilterData]
	When user selects category [Category] in CategorySelector CategoryList
	Then books in FilteredBookList are filtered by [Category]
#	When user adds section by AddSectionButton
	When user clicks button AddSectionButton
	Then SectionBlock section is added
	When user clicks button AddBookButton1
	Then BookSection1 section is added
	When user clicks button AddBookButton2
	Then BookSection2 section is added
	When user clicks button AddVocabularyAssessmentButton
	Then VocabularyAssessmentBlock section is added
	Then DifficultyBox value is [DifficultyValue]
	Then TimeBox value is [TimeValue]
	When user clicks button EditCourseButton
	When user enters data [CourseName] in CourseNameBox
	When user clicks button SaveCourseButton
	Then Name of course CourseNameBox is changed to [CourseName]
	When user clicks button EditSectionButton
	When user enters data [SectionName] in SectionNameBox
	When user clicks button SaveSectionButton
	Then Name of section SectionNameBox is changed to [SectionName]
	When user selects category All categories in CategorySelector CategoryList


	
Where:	
	FilterData	|	Category	| CourseName         |  SectionName		|	DifficultyValue	|	TimeValue
	Republic	|	philosophy	| SomeCourseName	 |	SomeSectionName	|	17.0			|	34:51		