Feature: Reader

Scenario: Test Filter by metadata

	Given I select data area reader
	When user selects category [Category] in CategorySelector CategoryList [StrNum]
	Then books in FilteredBookList are filtered by [Category]
	
Where:
	Category		|	StrNum
	economics		|	2
	fiction			|	3
	philosophy		|	4
	religion		|	5
	All categories	|	1