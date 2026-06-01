import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Authenticate user credentials and return a signed Bearer JWT token.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return await this.authService.login(body);
  }

  /**
   * POST /auth/logout
   * Client-side logout trigger.
   * Confirms successful logout so that the client (frontend/mobile app) can clear the access token from storage.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return {
      success: true,
      message: 'Logged out successfully. Please discard the access token on the client-side.',
    };
  }
}
