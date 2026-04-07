# Split Scope

## 1. Purpose
- This document locks the database split scope before we continue the physical refactor.
- The goal is to stop treating the root app database as the long-term shape of the system.
- From this point on, every new module is assumed to belong to its own storage boundary unless we explicitly decide otherwise.

## 2. Global Rules
- `workspace_auth` is the only authentication source of truth.
- The canonical user key is `workspace_auth.User.id`.
- Every module stores ownership with `authUserId`.
- Cross-database ownership is resolved in application logic, not with hard database foreign keys.
- Shared workspace concerns do not belong in a feature database.

## 3. Confirmed Database Boundaries

```text
workspace
├─ workspace_auth
│  ├─ User
│  ├─ OAuthAccount
│  └─ RefreshToken
│
├─ workspace_core
│  ├─ UserProfile
│  ├─ WorkspaceModulePreference
│  └─ WorkspaceSetting
│
├─ timetable_db
│  └─ Lesson
│
├─ calendar_db
│  └─ CalendarEvent
│
├─ tasks_db
│  └─ TaskItem
│
└─ projects_db
   ├─ Project
   ├─ ProjectMember
   └─ ProjectTask
```

## 4. Scope Per Database

### `workspace_auth`
- Owns credentials and identity only.
- Tables:
  - `User`
  - `OAuthAccount`
  - `RefreshToken`
- Must not store module business data.

### `workspace_core`
- Owns shared workspace and profile state.
- Tables:
  - `UserProfile`
    - `authUserId`
    - `emailSnapshot`
    - `alias`
    - future display metadata such as avatar, locale, timezone
  - `WorkspaceModulePreference`
    - active module list
    - ordering
    - future pin or visibility flags
  - `WorkspaceSetting`
    - workspace-level UI preferences
    - future notification and preference settings
- This is the target home for the current module sidebar state and profile-like data.

### `timetable_db`
- Owns timetable data only.
- Tables:
  - `Lesson`
  - future timetable-only tables
- Target ownership model:
  - `Lesson.authUserId`
- Long-term note:
  - the current local `User` table is transitional and should be removed once profile and ownership migration is complete.

### `calendar_db`
- Owns calendar data only.
- Tables:
  - `CalendarEvent`
- Ownership:
  - `CalendarEvent.authUserId`

### `tasks_db`
- Owns tasks data only.
- Tables:
  - `TaskItem`
- Ownership:
  - `TaskItem.authUserId`

### `projects_db`
- Owns project collaboration data only.
- Planned tables:
  - `Project`
  - `ProjectMember`
  - `ProjectTask`
  - related collaboration tables

## 5. Ownership Model

```text
workspace_auth.User.id
└─ authUserId
   ├─ workspace_core.UserProfile.authUserId
   ├─ workspace_core.WorkspaceModulePreference.authUserId
   ├─ timetable_db.Lesson.authUserId
   ├─ calendar_db.CalendarEvent.authUserId
   ├─ tasks_db.TaskItem.authUserId
   └─ projects_db.*.authUserId
```

- Each module table keeps its own local primary key.
- `authUserId` is the stable cross-service owner key.
- We are not relying on cross-db foreign key constraints.

## 6. What Must Leave `timetable_db`
- `WorkspaceModulePreference`
- profile-like fields currently hanging off the local `User`
- legacy `CalendarEvent`
- legacy `TaskItem`
- eventually the local `User` table itself, once timetable ownership switches to `authUserId`

## 7. Current Transition Status
- Runtime Prisma clients are already split into:
  - `core`
  - `timetable`
  - `calendar`
  - `tasks`
- `tasks` runtime ownership already uses `authUserId`.
- `calendar` runtime ownership already uses `authUserId`.
- The aggregate [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma) still exists as a temporary migration source for the root app.

## 8. Rollout Order

### Phase 1. `tasks_db`
- Deploy with `TASKS_DATABASE_URL`
- Push tasks schema to `tasks_db`
- Verify `/api/tasks` reads and writes only there
- Remove legacy `TaskItem` from `timetable_db`

### Phase 2. `calendar_db`
- Deploy with `CALENDAR_DATABASE_URL`
- Push calendar schema to `calendar_db`
- Verify `/api/calendar` reads and writes only there
- Remove legacy `CalendarEvent` from `timetable_db`

### Phase 3. `workspace_core`
- Create `workspace_core`
- Move module preferences
- Move profile-like fields
- Add a dedicated core Prisma schema and client contract for production rollout

### Phase 4. `timetable_db`
- Convert timetable ownership to `authUserId`
- Remove dependency on the local `User` relation
- Shrink the database to timetable-only data

### Phase 5. `projects_db`
- Start separated from the beginning
- Do not add project tables to the aggregate app schema

## 9. Done Criteria
- `workspace_auth` contains auth data only
- `workspace_core` contains shared workspace and profile data only
- `timetable_db` contains timetable data only
- `calendar_db` contains calendar data only
- `tasks_db` contains task data only
- new modules never default back to the aggregate app schema
