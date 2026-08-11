import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

/**
 * Danh bạ người dùng, phục vụ các ô chọn người ở Sơ đồ Tổ chức (bổ nhiệm trưởng
 * đơn vị, thêm nhân sự vào đơn vị).
 *
 * Cả hai route đều đòi `org.manage`, không chỉ đăng nhập: đây là toàn bộ danh
 * bạ nhân sự, và người tiêu thụ duy nhất là màn hình quản trị tổ chức. Ai cần
 * biết người xử lý một bước cụ thể thì đã đọc được qua chính đơn đó.
 */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('org.manage')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.usersService.findAll(search);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createFromAdmin(dto);
  }
}
