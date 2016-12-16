Feature: Reader

Scenario: Test edit class

	Given I select data area reader
	When I click on cover of book BookCover
###	
	Then We should see popup BookInfoPopup
	When I click on button BeginStudyButton
	Then we should see classroom link ClassroomLink
	When I click on classroom link ClassroomLink
###
#	Given It's time to refresh
	When I edit classroom PencilButton
#	When I edit classroom PencilButton
	Then we should see textbox NameTextbox
#	Then we should see textbox DescriptionTextbox
	When user inputs info [TestText1] in NameTextbox
	When user inputs info [TestText2] in DescriptionTextbox
	When I click done DoneButton
#	Then we should see button PencilButton
	Then we should see text [TestText1] in NameTextbox
#	Then we should see text [TestText2] in DescriptionTextbox
	
Where:
	TestText1			|TestText2
	FreshStudy			|TestDescription	