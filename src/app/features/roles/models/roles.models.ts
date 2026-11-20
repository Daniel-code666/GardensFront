export interface CreateRoleRequest {
    name: string;
    description: string;
    administrativeRole: boolean;
}

export interface CreateRoleResponse {
    id: number;
    name: string;
    description: string;
    administrativeRole: boolean;
}

