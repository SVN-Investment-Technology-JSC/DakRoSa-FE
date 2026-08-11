import { ArrayNotEmpty, IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự.' })
  fullName: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  password: string;

  /** Bỏ trống thì mặc định `approver` — xem `UsersService.createFromAdmin`. */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleNames?: string[];
}
