Feature: Reader

Scenario: Test create class

	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	
	When I toggle menu ToggleMenu
	
	When I click item NewStudyCourseItem
	Then we should see new course NewCoursePopup
	When I click on button CreateNewCourseButton
	Then we should see course template StudyProjectTemplate

	Given I select data area reader

#	When I click on button PencilButton
	When user inputs info [TestText1] in NameTextArea
	When user inputs info [TestText2] in DescriptionTextArea
	When user clicks button CourseType
	When I click next step NextStepButton
	Then we should see step Publication

	When user selects option SamplePub
#	Then Selected publication SelectedPub contains [Name]
	When I click next step NextStepButton
	Then we should see step Duration
		
	Given I click selector HoursPerDay
	When user selects option HoursPerDayValue
###	
	When user clicks button DateInputButton1
	Then Calendar popup CalendarPopup appears
	When user selects option StartDate
	When user clicks button DateInputButton2
	Then Calendar popup CalendarPopup appears
	When user selects option FinishDate
###
	When user clicks button CreateButton
#	When user clicks button CreateButton
#	When I click on button InviteToStudyClassCancel
	
Where:
	TestText1		|TestText2			|Name
	SomeCourse		|TestDescription	|Paris Talks