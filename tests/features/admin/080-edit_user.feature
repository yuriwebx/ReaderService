Feature: Admin

Scenario: Edit user info
	Given I select data area admin
	When I click on Edit button EditUserButton5
	Then We should see Edit form EditUserPopup
	
	When Input [FirstName] into FirstName
	Then We should see name FirstName = [FirstName]
	When Input [LastName] into LastName
	Then We should see name LastName = [LastName]
	When Input email [Email] into EmailBox
	Then We should see email EmailBox = [Email]
	
	When I click on popup save EditUserPopupSaveButton
#	Then We should see saved SavedUser3 = [LastName] [FirstName] 
	Then We should see saved SavedUser3 = [Email]
	
	Where:
	  FirstName  | LastName | Email   
	  Quake   	 | Halflife | andro52id@gmail.com