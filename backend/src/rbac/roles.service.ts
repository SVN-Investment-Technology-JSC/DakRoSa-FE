import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  findByNames(names: string[]): Promise<Role[]> {
    return this.rolesRepository.find({ where: { name: In(names) } });
  }

  findAll(): Promise<Role[]> {
    return this.rolesRepository.find();
  }
}
