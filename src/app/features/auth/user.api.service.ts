import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { LoginRequest, LoginResponse, UserDeleteRequest } from "./models/auth.models";
import { environment } from "../../../environments/environment";
import { SessionService } from "../../core/auth/session.service";
import { CreateUserRequest, CreateUserResponse, RegisterUserRequest } from "./models/register.models";
import { OperationResult } from "../../core/models/generic.models";
import { toHttpParams } from "../../core/http/api-params";

@Injectable({
    providedIn: 'root'
})
export class UserApiService {
    private readonly http = inject(HttpClient);
    private readonly session = inject(SessionService);

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/Auth/Login`, request).pipe(tap((response) => this.session.setSession(response)));
        // return this.http.post<LoginResponse>('http://127.0.0.1:8080/api/Auth/Login', request).pipe(tap((response) => this.session.setSession(response)));
    }

    register(request: RegisterUserRequest): Observable<OperationResult<CreateUserResponse>> {
        return this.http.post<OperationResult<CreateUserResponse>>(`${environment.apiBaseUrl}/User/Register`, request);
    }

    createUser(request: CreateUserRequest): Observable<OperationResult<CreateUserResponse>> {
        return this.http.post<OperationResult<CreateUserResponse>>(`${environment.apiBaseUrl}/User/CreateUser`, request);
    }

    getAllUsers(roleId: number | null, roleName: string | null): Observable<OperationResult<CreateUserResponse[]>> {
        return this.http.get<OperationResult<CreateUserResponse[]>>(`${environment.apiBaseUrl}/User/GetAllUsers`, { params: toHttpParams({ roleId, roleName }) });
    }

    updateUser(request: CreateUserResponse): Observable<OperationResult<CreateUserResponse>> {
        return this.http.put<OperationResult<CreateUserResponse>>(`${environment.apiBaseUrl}/User/UpdateUser`, request);
    }

    deleteUsers(request: UserDeleteRequest): Observable<OperationResult<number>> {
        return this.http.delete<OperationResult<number>>(`${environment.apiBaseUrl}/User/DeleteUsers`, {body:request});
    }

    reactivateUsers(request: UserDeleteRequest): Observable<OperationResult<boolean>> {
        return this.http.post<OperationResult<boolean>>(`${environment.apiBaseUrl}/User/ReactivateUsers`, request);
    }

    getUserById(id: number): Observable<OperationResult<CreateUserResponse>>{
        return this.http.get<OperationResult<CreateUserResponse>>(`${environment.apiBaseUrl}/User/GetUserById/${id}`)
    }

    getUserByEmail(email: string): Observable<OperationResult<CreateUserResponse>>{
        return this.http.get<OperationResult<CreateUserResponse>>(`${environment.apiBaseUrl}/User/GetUserByEmail`, {params: toHttpParams({email})})
    }
}
