---
name: Users, Roles & Permissions Module Closure
description: Module #9 sealed 2026-05-08 — dashboard views for users, role assignments, role/module permissions
type: feature
---

# Module #9 — Users, Roles & Permissions (CLOSED 2026-05-08)

## Tables (existing)
- `profiles`, `user_roles` (app_role enum, 12 roles), `role_permissions`, `module_permissions`
- `has_role(_user_id, _role)` SECURITY DEFINER for safe RBAC checks

## New Views (security_invoker)
- `v_users_dashboard` — users with roles[], role_count, activity_state
- `v_user_roles_dashboard` — assignments enriched with user + assigner names
- `v_role_permissions_dashboard` — aggregated permission counts per role
- `v_module_permissions_dashboard` — module on/off state per role

## Hard Rules
- Roles ALWAYS in `user_roles` table — never on profiles (privilege escalation risk)
- Never trust client-side role checks for sensitive operations
- Views respect RLS via security_invoker