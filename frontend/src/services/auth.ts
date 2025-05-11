/**
 * 认证服务 - 管理token和认证状态
 */
class AuthService {
    private readonly TOKEN_KEY = 'auth_token';

    /**
     * 获取token
     */
    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * 设置token
     */
    setToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    /**
     * 清除token
     */
    clearToken(): void {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    /**
     * 检查是否已认证
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    /**
     * 获取认证头信息
     */
    getAuthHeaders(): Record<string, string> {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

// 导出实例
const authService = new AuthService();
export default authService;
