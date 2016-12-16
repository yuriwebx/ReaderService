Feature: Reader

Scenario: Test Recently open publications

	Given I select data area common
	Given I introduce BookName8 in FilterBox
    Then We should see filter has matching SeekingBook8
	Then We should see SeekingBook8 in list
	When I open book SeekingBook8
    Then We should see BookContent view
#	Then [Book1] is displayed on toolbar BookToolbar
#	Then And [Author1] is displayed on toolbar BookToolbar

	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	
	Given I select data area common
	When user clicks on toolbar BookToolbar
	Then Popup RecentlyOpenedPublicationsPopup is opened
	Then Book [Book1] is in the list
	Then Book [Book2] is in the list
	When user clicks on tab StudyProjectTab
	Then related RelatedCourse are shown in the list
	When user clicks on tab BooksTab
	When I open book RecentBook2
    Then We should see BookContent view
#	Then [Book2] is displayed on toolbar BookToolbar	
	
where:
		Book1				|	Author1			|	Book2
		Divine Philosophy	|	, ‘Abdu’l-Bahá	|	The Gift of the Magi