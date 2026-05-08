# Module #9 — Users, Roles & Permissions (CLOSED 2026-05-08)

## Existing Foundation
- `profiles` (51 rows) — base user profile data
- `user_roles` (18 rows) — role assignments via `app_role` enum
- `role_permissions` (8 rows) — resource/action grants per role
- `module_permissions` (53 rows) — module on/off per role
- `has_role(_user_id, _role)` SECURITY DEFINER function (already in place)
- `RoleGuard`, `PermissionGate`, `useUserRoles`, `useModulePermissions` (frontend)

## Roles (`app_role` enum)
admin, manager, staff, technician, vendor, customer, warehouse, accounting, engineering, dispatcher, owner, finance

## New Views (security_invoker=true)

### `v_users_dashboard`
Per user: display_name, email, phone, position, roles[], role_count,
`activity_state` (active <30d | idle <90d | inactive | deleted), joined_at.

### `v_user_roles_dashboard`
Each role assignment with user name, assigned_by name, assigned_at.

### `v_role_permissions_dashboard`
Aggregated per role: permission_count, resource_count, resources[], actions[].

### `v_module_permissions_dashboard`
Module flags per role with `state` (enabled|disabled).

## Frontend integration points
- `/users` → `UsersPage.tsx` — switch to `v_users_dashboard`
- `/admin/users` → `UserManagement.tsx`
- `/admin/modules` → `ModuleSettings.tsx` — switch to `v_module_permissions_dashboard`

## Security Notes
- Roles MUST stay in `user_roles` (separate table) — never on `profiles`
- All role checks server-side via `has_role()` — never trust client storage
- Views inherit RLS from underlying tables (security_invoker)