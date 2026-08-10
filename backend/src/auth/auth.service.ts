import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { OrgUnitsService } from '../org-units/org-units.service';

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
  roles: string[];
  permissions: string[];
  /** The team the user actually works in — scopes what they see in Workspace. */
  orgUnit: { id: string; title: string; level: number } | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly orgUnitsService: OrgUnitsService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async getProfile(userId: string): Promise<AuthProfile> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    // `roles` and `role.permissions` are both eager relations on the entity.
    const unit = await this.orgUnitsService.findSmallestUnitOfUser(user.id);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarInitials: user.avatarInitials,
      roles: (user.roles ?? []).map((r) => r.name),
      permissions: [
        ...new Set((user.roles ?? []).flatMap((r) => (r.permissions ?? []).map((p) => p.key))),
      ],
      orgUnit: unit ? { id: unit.id, title: unit.title, level: unit.level } : null,
    };
  }

  async login(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') as any,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') as any,
    });
    return {
      accessToken,
      refreshToken,
      user: await this.getProfile(user.id),
    };
  }
}
