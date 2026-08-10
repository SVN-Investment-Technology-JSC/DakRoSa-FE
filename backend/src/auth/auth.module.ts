import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { OrgUnitsModule } from '../org-units/org-units.module';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => OrgUnitsModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionsGuard],
  exports: [AuthService, PermissionsGuard],
})
export class AuthModule {}
