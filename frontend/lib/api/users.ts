import { apiClient } from './client';
import { Role } from '../types/core/roles';

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
        const { data } = await apiClient.get<User[]>('/users');
        return data;
    },

    assignRoles: async (userId: string, roleCodes: string[]): Promise<User> => {
        const { data } = await apiClient.put<User>(`/users/${userId}/roles`, { roleCodes });
        return data;
    },
};
