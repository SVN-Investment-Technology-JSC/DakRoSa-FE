import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Role } from '../rbac/role.entity';
import { RolesService } from '../rbac/roles.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  /**
   * Danh bạ người dùng — nguồn cho mọi ô chọn người (bổ nhiệm trưởng đơn vị,
   * thêm nhân sự vào đơn vị). Chỉ trả người còn hoạt động; `search` khớp cả họ
   * tên lẫn email để gõ kiểu nào cũng tìm ra.
   */
  async findAll(search?: string): Promise<UserDirectoryEntry[]> {
    const users = await this.usersRepository.find({
      where: { isActive: true },
      order: { fullName: 'ASC' },
    });

    // Lọc trong bộ nhớ chứ không bằng `ILIKE`: Postgres so sánh không phân biệt
    // HOA/thường nhưng vẫn phân biệt DẤU, nên gõ "tuan" sẽ không ra "Tuấn" —
    // mà gõ không dấu mới là cách người dùng thường tìm. Bỏ dấu ở cả hai phía
    // cần `unaccent`, tức thêm một extension và một migration chỉ để phục vụ ô
    // tìm kiếm của một danh bạ nội bộ cỡ vài trăm người.
    const term = normalize(search ?? '');
    const matched = term
      ? users.filter(
          (u) => normalize(u.fullName).includes(term) || normalize(u.email).includes(term),
        )
      : users;

    // `roles` là eager nên luôn kéo theo cả cây quyền; một ô chọn người không
    // cần tới đó, và trả nguyên si thì mỗi lần gõ tìm kiếm lại tải vài chục KB.
    return matched.slice(0, 200).map(toDirectoryEntry);
  }

  /** Includes passwordHash (excluded by default) — only for login/credential checks. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.email = :email', { email })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }


  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    avatarInitials?: string;
    roles?: Role[];
  }): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  /**
   * Tạo người dùng từ giao diện quản trị (Sơ đồ Tổ chức → thêm nhân sự).
   *
   * Mặc định gắn quyền `approver`: một người được đưa vào sơ đồ tổ chức là để
   * xử lý công việc, mà không có `task.approve` thì họ nhận được việc rồi đứng
   * im — một cái bẫy im lặng chỉ lộ ra lúc đơn đã chạy tới bước của họ.
   */
  async createFromAdmin(data: {
    email: string;
    password: string;
    fullName: string;
    roleNames?: string[];
  }): Promise<UserDirectoryEntry> {
    const email = data.email.trim().toLowerCase();
    if (await this.usersRepository.findOne({ where: { email } })) {
      throw new BadRequestException(`Email "${email}" đã được dùng cho một tài khoản khác.`);
    }

    const roleNames = data.roleNames?.length ? data.roleNames : ['approver'];
    const roles = await this.rolesService.findByNames(roleNames);
    const unknown = roleNames.filter((n) => !roles.some((r) => r.name === n));
    if (unknown.length) {
      throw new BadRequestException(`Quyền không tồn tại: ${unknown.join(', ')}.`);
    }

    const created = await this.create({
      email,
      passwordHash: await bcrypt.hash(data.password, 10),
      fullName: data.fullName.trim(),
      avatarInitials: initialsFor(data.fullName),
      roles,
    });
    return toDirectoryEntry(created);
  }
}

/** Người dùng dưới góc nhìn của một ô chọn người: đủ để hiện, không hơn. */
export interface UserDirectoryEntry {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
  roleNames: string[];
}

function toDirectoryEntry(user: User): UserDirectoryEntry {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarInitials: user.avatarInitials,
    roleNames: (user.roles ?? []).map((r) => r.name),
  };
}

/** Bỏ dấu + hạ chữ thường, để "tuan" khớp được với "Tuấn". */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/**
 * Chữ cái đại diện cho avatar: hai từ cuối của họ tên, kiểu "Nguyễn Văn Tuấn" →
 * "VT". Lấy từ cuối vì tiếng Việt gọi nhau bằng tên, không phải bằng họ.
 */
function initialsFor(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
