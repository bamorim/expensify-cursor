# Task Template

## Meta Information

- **Task ID**: `TASK-0001`
- **Title**: Design and implement database schema with basic UI
- **Status**: `Complete`
- **Priority**: `P0`
- **Created**: 2025-01-27
- **Updated**: 2025-01-27
- **Estimated Effort**: 2-3 days
- **Actual Effort**: [Hours/Days]

## Related Documents

- **PRD**: [PRD: Core Expense Reimbursement System](../product/prd-main.md)
- **ADR**: [0001-use-t3-stack](../technical/decisions/0001-use-t3-stack.md)
- **Dependencies**: None (foundation task)

## Description

This task establishes the foundation for the expense management system by designing and implementing the database schema and creating basic UI components. The current project has NextAuth with magic link authentication already implemented, so we'll build upon that foundation. We need to remove the demo Post model and create a proper multi-tenant database structure for organizations, users, categories, policies, and expenses.

## Acceptance Criteria

- [ ] Database schema supports multi-tenant organizations with proper data isolation
- [ ] User model supports role-based access (Admin/Member) within organizations
- [ ] All core entities (Organization, ExpenseCategory, Policy, Expense) are properly modeled
- [ ] Post model is completely removed from the system
- [ ] Basic organization creation screen is functional
- [ ] Basic user dashboard shows organization overview
- [ ] tRPC routes are protected with role-based middleware
- [ ] Organization-scoped data access controls are implemented
- [ ] Database migrations run successfully without errors

## TODOs

- [x] Design database schema for multi-tenant expense management
  - [x] Create Organization model with multi-tenancy support
  - [x] Create OrganizationMember model for user-org relationships
  - [x] Create ExpenseCategory model (organization-scoped)
  - [x] Create Policy model (organization-wide and user-specific)
  - [x] Create Expense model with status tracking
  - [x] Create PolicyApplication model for audit trail
  - [x] Update existing User model to support new relationships
- [x] Remove Post model and related code
  - [x] Remove Post model from schema.prisma
  - [x] Remove Post-related tRPC routes
  - [x] Remove Post-related UI components
  - [x] Clean up any Post-related imports
- [x] Implement database migrations
  - [x] Generate migration files
  - [x] Test migration on development database
  - [x] Verify data integrity after migration
- [x] Create basic UI components
  - [x] Build organization creation form
  - [x] Create user dashboard layout
  - [x] Implement organization overview component
- [x] Set up authorization middleware
  - [x] Create role-based middleware for tRPC routes
  - [x] Implement organization-scoped data access controls
  - [x] Test authorization on protected routes (basic testing via organization router)

## Progress Updates

### 2025-01-27 - Implementation
**Status**: Complete
**Progress**: Database schema designed and implemented, Post model removed, basic UI components created, organization tRPC router implemented, authorization middleware created with role-based and organization-scoped access controls
**Blockers**: None
**Next Steps**: Ready to proceed to Task 0002 (Organization Management)

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Code review completed

## Notes

- The project already has NextAuth with magic link authentication implemented
- Focus on creating a solid foundation that supports the multi-tenant architecture
- Ensure proper foreign key relationships and indexes for performance
- Consider adding database constraints for data integrity
- The Post model removal should be done carefully to avoid breaking existing functionality

---

**Template Version**: 1.0
**Last Updated**: 2025-01-27
