Feature: Admin

Scenario: Edit user roles

	Given I select data area admin
	When I click on Edit button EditUserButton2
	
	Then We should see Edit form EditUserPopup
	When I select role EditorRoleButton
#	Then We should see this role checked EditorRoleChecked
	When I select role AdminRoleButton
#	Then We should see this role checked AdminRoleChecked	
	When I click EditUserPopupSaveButton to submit form
	Then We should see AdminRoleMark2 in row is Admin
	Then We should see EditorRoleMark2 in row is Editor
	When I click on Edit button EditUserButton2
	Then We should see Edit form EditUserPopup
	When I select role EditorRoleButton
	When I select role AdminRoleButton
	When I click EditUserPopupSaveButton to submit form
	Then We should see noAdminRoleMark2 in row
	Then We should see noEditorRoleMark2 in row	
