Feature: Reader

Scenario: Test remove from my books

	Given I select data area reader
    When I click on BookInfoButton of book [MyBook]
	Then We should see popup BookInfoPopup
	Then We should see tab InfoTab
	When I click on button RemoveButton
#	When I click on button CloseButton
	Then [MyBook] is absent in the list MyBooksList
	When user clicks button LibraryLink
#	Given I select data area common
#	When user clicks button ResumeButton
	
Where:
		MyBook
		The Republic
