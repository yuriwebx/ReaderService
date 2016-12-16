Feature: Admin

Scenario: Password reset

	Given I select data area admin
	When I click on Edit button EditUserButton4
	Then We should see Edit form EditUserPopup
	When I select password reset PasswordResetButton
	Then We should see password reset state changed PasswordResetStateChanged
	When I click EditUserPopupSaveButton to submit form
	Then We should see user list UserList
	Then We should see filter box FilterBox
	

