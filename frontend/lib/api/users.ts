import {
  assignRoles as assignRolesGenerated,
  getAllUsers as getAllUsersGenerated,
} from '@/lib/generated/api/user-controller/user-controller';
import {Role} from '../types/core/roles';

/**
 * T3-12 migration (wave 2): thin facade over the orval-generated
 * `user-controller` client. Public `usersApi` surface preserved so existing
 * callers (`useRoleAdminUsers`, `app/admin/employees/page.tsx`,
 * `app/admin/permissions/page.tsx`) need no edits.
 *
 * Generated calls route through `apiClient` via `orvalMutator`, preserving
 * cookie auth, CSRF double-submit, the 401 refresh mutex, and tenant headers.
 *
 * Backend `/api/v1/users` returns `Page<UserResponse>`; the original
 * hand-rolled signature lied with `User[]`. The `app/admin/permissions/page`
 * caller already handles both array and `{content: User[]}` shapes, so we
 * pass an empty Pageable and keep the declared return type stable.
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  userStatus: string;
  roles: Role[];
  lastLoginAt?: string;
  createdAt: string;
}

export interface AssignRolesRequest {
  roleCodes: string[];
}

export const usersApi = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await getAllUsersGenerated({pageable: {}});
    return response as unknown as User[];
  },

  assignRoles: async (userId: string, roleCodes: string[]): Promise<User> => {
    const response = await assignRolesGenerated(userId, {roleCodes});
    return response as unknown as User;
  },
};
