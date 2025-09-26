import { IUser, Role } from "./user.interface";
import { Mail } from "./mail.interfaces";
import { OtpTemplateData } from "./otp.interfaces";
import { UpdateProfileRequest, ChangePasswordRequest, UserResponse } from "./user.request.interfaces";
import { CreateTaskRequest, UpdateTaskRequest, TaskResponse, TaskStats } from "./task.interfaces";
import { NotificationResponse } from "./notification.interfaces";
import { FollowRequest, FollowResponse, UserFollowStats, FollowersResponse, FollowingResponse } from "./follow.interfaces";
import { CreateMeetingRequest, UpdateMeetingRequest, MeetingResponse, MeetingStats, MeetingStatus, MeetingType, IMeeting } from "./meeting.interfaces";
import { IProject, CreateProjectRequest, UpdateProjectRequest, ProjectResponse, ProjectStatsResponse, AddMemberRequest, UpdateMemberRoleRequest, AddLinkRequest, UpdateLinkRequest, RemoveLinkRequest, RemoveMemberRequest } from "./project.interfaces";
import { ITeam, CreateTeamRequest, UpdateTeamRequest, TeamResponse, TeamStatsResponse, AddTeamMemberRequest, UpdateTeamMemberRoleRequest, RemoveTeamMemberRequest } from "./team.interfaces";
import { FriendRequestResponse, FriendshipResponse, SendFriendRequestRequest, RespondToFriendRequestRequest, FriendStatsResponse } from "./friend.interfaces";
import { IChatRequest, CreateChatRequest, SendMessageRequest, UpdateMessageRequest, ChatResponse, MessageResponse, SocketUser } from "./chat.interfaces";

export { IUser, Role, Mail, OtpTemplateData, UpdateProfileRequest, ChangePasswordRequest, UserResponse, CreateTaskRequest, UpdateTaskRequest, TaskResponse, TaskStats, NotificationResponse, FollowRequest, FollowResponse, UserFollowStats, FollowersResponse, FollowingResponse, CreateMeetingRequest, UpdateMeetingRequest, MeetingResponse, MeetingStats, MeetingStatus, MeetingType, IMeeting, IProject, CreateProjectRequest, UpdateProjectRequest, ProjectResponse, ProjectStatsResponse, AddMemberRequest, UpdateMemberRoleRequest, AddLinkRequest, UpdateLinkRequest, RemoveLinkRequest, RemoveMemberRequest, ITeam, CreateTeamRequest, UpdateTeamRequest, TeamResponse, TeamStatsResponse, AddTeamMemberRequest, UpdateTeamMemberRoleRequest, RemoveTeamMemberRequest, FriendRequestResponse, FriendshipResponse, SendFriendRequestRequest, RespondToFriendRequestRequest, FriendStatsResponse, IChatRequest, CreateChatRequest, SendMessageRequest, UpdateMessageRequest, ChatResponse, MessageResponse, SocketUser }