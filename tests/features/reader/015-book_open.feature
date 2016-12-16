Feature: Reader

Scenario: Test book opening

	Given I select data area common
    Given I introduce BookName2 in FilterBox
   Then We should see filter has matching SeekingBook2
#	Then We should see SeekingBook2 in list

#	Given It's time to refresh
	
	When I open book SeekingBook2
    Then We should see BookContent view
