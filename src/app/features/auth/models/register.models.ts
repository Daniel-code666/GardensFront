export interface CreateUserRequest {
    name: string;
    email: string;
    password: string;
    roleId: number;
    roleName: string;
}

export interface RegisterUserRequest {
    name: string;
    email: string;
    password: string;
}

export interface CreateUserResponse {
    id: number;
    name: string;
    email: string;
    password: string;
    roleId: number;
    roleName: string;
    active: boolean;
}