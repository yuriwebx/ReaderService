Feature: Reader

Scenario: Test View book info

	Given I select data area common
    Given I introduce BookName2 in FilterBox
    Then We should see filter has matching SeekingBook2
	Then We should see SeekingBook2 in list

	Given I select data area reader
	When I click on BookInfoButton of book [Book]
	Then We should see popup BookInfoPopup
	Then We should see tab InfoTab
#	Then popup BookInfoPopup is opened on tab InfoTab, category, time, difficulty, number of related study guides and description are displayed
	When user clicks on tab RelatedTab
	Then related RelatedStudyGuide are shown in the list
	When user clicks button CloseButton
	Then Library page LibraryList is opened
###
	Given I select data area common
    Given I introduce [Course] in FilterBox

	Given I select data area reader
	When I click on BookInfoButton of book [Course]
#	When I click on BookInfoButton of book [Course]
	Then We should see popup BookInfoPopup
	Then We should see tab InfoTab
	When user clicks on tab ContentTab
	Then related RelatedBooks are shown in the list
	Then related VocabularyAssessments are shown in the list
	When user clicks button CloseButton
	Then Library page LibraryList is opened
###
Where:	           
	Book			| Course
	The Republic	| BookName5