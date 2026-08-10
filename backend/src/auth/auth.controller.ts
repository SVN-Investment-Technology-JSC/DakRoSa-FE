import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  /**
   * Full profile of the caller: identity + roles + permissions + which org unit
   * they belong to. The client needs all of it to decide what to show, and it
   * is deliberately NOT in the JWT so that a role change takes effect without
   * waiting for the token to expire.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    const jwtUser = req.user as JwtPayload;
    return this.authService.getProfile(jwtUser.sub);
  }
}
