/**
 * Central permission keys for RBAC. Admin role uses '*' in DB for full access.
 */
const P = {
  ALL: '*',
  USERS_MANAGE: 'users:manage',
  ROLES_VIEW: 'roles:view',
  ROLES_MANAGE: 'roles:manage',
  TASKS_VIEW_ALL: 'tasks:view_all',
  TASKS_VIEW_ASSIGNED: 'tasks:view_assigned',
  TASKS_CREATE: 'tasks:create',
  TASKS_EDIT: 'tasks:edit',
  TASKS_EDIT_OWN: 'tasks:edit_own',
  TASKS_DELETE: 'tasks:delete',
  TASKS_ASSIGN: 'tasks:assign',
  TASKS_COMPLETE: 'tasks:complete',
  TASKS_VERIFY: 'tasks:verify',
  MASTERS_MANAGE: 'masters:manage',
  DASHBOARD_TEAM: 'dashboard:team',
  DASHBOARD_SELF: 'dashboard:self',
};

/** All explicit keys (excludes ALL) for listing in admin UI */
const ALL_KEYS = Object.values(P).filter((k) => k !== P.ALL);

/** Default permissions when `permissions` array is empty on a role document (legacy DB). */
const LEGACY_DEFAULTS_BY_ROLE_NAME = {
  Admin: [P.ALL],
  Supervisor: [
    P.TASKS_VIEW_ALL,
    P.TASKS_CREATE,
    P.TASKS_EDIT,
    P.TASKS_ASSIGN,
    P.TASKS_COMPLETE,
    P.TASKS_VERIFY,
    P.MASTERS_MANAGE,
    P.DASHBOARD_TEAM,
    P.ROLES_VIEW,
  ],
  Technician: [
    P.TASKS_VIEW_ASSIGNED,
    P.TASKS_EDIT_OWN,
    P.TASKS_COMPLETE,
    P.DASHBOARD_SELF,
  ],
  User: [
    P.TASKS_VIEW_ASSIGNED,
    P.TASKS_EDIT_OWN,
    P.TASKS_COMPLETE,
    P.DASHBOARD_SELF,
  ],
};

/** Seed values per role name */
const SEED_PERMISSIONS_BY_ROLE_NAME = {
  Admin: [P.ALL],
  Supervisor: [
    P.TASKS_VIEW_ALL,
    P.TASKS_CREATE,
    P.TASKS_EDIT,
    P.TASKS_ASSIGN,
    P.TASKS_COMPLETE,
    P.TASKS_VERIFY,
    P.MASTERS_MANAGE,
    P.DASHBOARD_TEAM,
    P.ROLES_VIEW,
  ],
  Technician: [
    P.TASKS_VIEW_ASSIGNED,
    P.TASKS_EDIT_OWN,
    P.TASKS_COMPLETE,
    P.DASHBOARD_SELF,
  ],
  User: [
    P.TASKS_VIEW_ASSIGNED,
    P.TASKS_EDIT_OWN,
    P.TASKS_COMPLETE,
    P.DASHBOARD_SELF,
  ],
};

function normalizeRoleDoc(role) {
  if (!role) return null;
  if (typeof role === 'object' && role.role_name) return role;
  return null;
}

/**
 * @param {import('mongoose').Document} user - User with populated `roles`
 * @returns {string[]}
 */
function getPermissionsFromUser(user) {
  const set = new Set();
  const roles = user.roles || [];
  for (const r of roles) {
    const doc = normalizeRoleDoc(r);
    if (!doc) continue;
    const name = doc.role_name;
    const fromDb = doc.permissions;
    let list = Array.isArray(fromDb) && fromDb.length > 0
      ? fromDb
      : (LEGACY_DEFAULTS_BY_ROLE_NAME[name] || []);
    list.forEach((p) => set.add(p));
  }
  return [...set];
}

function userHasPermission(user, permission) {
  const perms = getPermissionsFromUser(user);
  if (perms.includes(P.ALL)) return true;
  return perms.includes(permission);
}

/** True if user has any of the given permissions (or ALL). */
function userHasAnyPermission(user, permissions) {
  if (!permissions || permissions.length === 0) return false;
  const perms = getPermissionsFromUser(user);
  if (perms.includes(P.ALL)) return true;
  return permissions.some((p) => perms.includes(p));
}

module.exports = {
  P,
  ALL_KEYS,
  LEGACY_DEFAULTS_BY_ROLE_NAME,
  SEED_PERMISSIONS_BY_ROLE_NAME,
  getPermissionsFromUser,
  userHasPermission,
  userHasAnyPermission,
};
