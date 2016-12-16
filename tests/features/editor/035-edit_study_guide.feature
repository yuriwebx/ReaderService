Feature: Editor

Scenario: Test edit study guide

	When I click on edit button EditButton
	Then We should see area StudyGuideHeaderArea
	Then We should see area DescriptionArea
	Given In text StudyGuideHeaderArea type StudyGuideHeaderText13
	Given In text DescriptionArea type DescriptionText
	Then We should see new text in text areas
	When I click save button SaveButton
#	Then We should see StudyGuideHeaderAreaContainer contains StudyGuideHeaderText
#	Then We should see DescriptionContainer contains DescriptionText
	
	When user clicks out of study guide OutOfStudyGuidePopup
#	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
#	When I click out of popup OutOfPopup
#	When I click out of popup OutOfPopup
#	Then We should close popup and see BookContent	
###	
	When I click on library LibraryButton
	Then We should see book list BookList
	
    When I click on seeking SeekingStudyGuide
	Then We should see book BookNamePlace has name StudyGuideHeaderText
	Then We should see description DescriptionPlace looks like DescriptionText
###

