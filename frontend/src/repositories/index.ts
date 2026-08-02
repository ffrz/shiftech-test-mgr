// Barrel export — single entry point for all repositories, so services
// import from '../repositories' instead of reaching into individual files.
export { activityRepository } from './activityRepository';
export { auditLogRepository } from './auditLogRepository';
export { dashboardRepository } from './dashboardRepository';
export { entityAttachmentRepository } from './entityAttachmentRepository';
export { issueRepository } from './issueRepository';
export { moduleRepository } from './moduleRepository';
export { notificationRepository } from './notificationRepository';
export { profileRepository } from './profileRepository';
export { projectMemberRepository } from './projectMemberRepository';
export { projectRepository } from './projectRepository';
export { tagRepository } from './tagRepository';
export { testCaseRepository } from './testCaseRepository';
export { testCaseStepRepository } from './testCaseStepRepository';
export { testPlanRepository } from './testPlanRepository';
export { testResultRepository } from './testResultRepository';
export { testRoleRepository } from './testRoleRepository';
export { testRunRepository } from './testRunRepository';
export { testSuiteRepository } from './testSuiteRepository';
export { userRepository } from './userRepository';
