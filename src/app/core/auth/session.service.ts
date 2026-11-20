import { Injectable, computed, signal } from "@angular/core";
import { LoginResponse } from "../../features/auth/models/auth.models";

@Injectable({
    providedIn: 'root'
})
export class SessionService {
    private readonly storageKey = 'gardens_session';

    private readonly session = signal<LoginResponse | null>(this.loadSession());

    readonly user = computed(() => this.session()?.user ?? null);

    readonly token = computed(() => {
        const session = this.session();

        return session && !this.isExpired(session) ? session.accessToken : null;
    });

    readonly isAdmin = computed(() => this.user()?.isAdmin ?? false);

    readonly isAuthenticated = computed(() => this.token() != null);

    readonly roleName = computed(() => this.user()?.roleName ?? 'NormalUser');

    setSession(response: LoginResponse): void {
        sessionStorage.setItem(this.storageKey, JSON.stringify(response));
        this.session.set(response);
    }

    clearSession(): void {
        sessionStorage.removeItem(this.storageKey);
        this.session.set(null);
    }

    hasValidSession(): boolean {
        const session = this.session();

        if (!session) return false;

        if (this.isExpired(session)) {
            this.clearSession();
            return false;
        }

        return true;
    }

    accessToken(): string | null {
        return this.isAuthenticated() ? this.session()?.accessToken ?? null : null;
    }

    private loadSession(): LoginResponse | null {
        try {
            const stored = sessionStorage.getItem(this.storageKey);

            if (!stored) return null;

            const session = JSON.parse(stored) as LoginResponse;

            if (this.isExpired(session)) {
                sessionStorage.removeItem(this.storageKey);
                null;
            }

            return session;
        }
        catch {
            sessionStorage.removeItem(this.storageKey);
            return null;
        }
    }

    private isExpired(session: LoginResponse): boolean {
        return Date.parse(session.expiresAtUtc) <= Date.now() || !Number.isFinite(Date.parse(session.expiresAtUtc));
    }
}