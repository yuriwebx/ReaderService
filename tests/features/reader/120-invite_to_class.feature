Feature: Reader

Scenario: Invite to class

	When I click on membership MembershipLink
	When I click on icon RemoveUserButton
###
	When I click on classroom ClassroomRef
	Given It's time to refresh
###
	When I click on invite button InviteStudents
	Then we should see invite popup InvitePopup
	When I click on invite InviteUserButton
	Then we should see invited InvitedLink
#	Given It's time to refresh
	When I click CloseInvitePopup invite popup