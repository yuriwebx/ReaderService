Feature: Reader
	
Scenario: Test table of content

	Given I select data area common
	When I select [Chapter] of content
	Then We should see the matching header [Header]
###	
	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	
	Given I select data area common
	When I click button book extra BookExtraButton
#	When I click button book extra BookExtraButton
	Then Popup ExtraPopup is displayed
###
	When I toggle menu ToggleMenu
	Then We should see item ExtrasItem
	When I click item ExtrasItem
	
Where:
		Chapter			|	Header
		SampleChapter1	|	MatchingHeader1
		SampleChapter2	|	MatchingHeader2
		SampleChapter3	|	MatchingHeader3
		SampleChapter4	|	MatchingHeader4
		SampleChapter5	|	MatchingHeader5
