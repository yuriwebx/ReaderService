Feature: Editor

Scenario: Test book opening
	
	Given I select data area common
	
#	When I focus on filter FilterBox
#	Then I can enter some text
	
    Given I introduce BookName13 in FilterBox
    Then We should see FilterBox has matching SeekingBook13
	
    When I open book SeekingBook13
#	When I open book SeekingBook13
    Then We should see BookContent view
###	
	Given I select data area editor
	Then We should see button CreateStudyGuideButton
###	
