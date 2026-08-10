import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './position.entity';
import { CreatePositionDto } from './dto/create-position.dto';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private readonly positionsRepository: Repository<Position>,
  ) {}

  findAll(): Promise<Position[]> {
    return this.positionsRepository.find({ order: { rank: 'ASC', name: 'ASC' } });
  }

  create(dto: CreatePositionDto): Promise<Position> {
    const position = this.positionsRepository.create({
      code: dto.code,
      name: dto.name,
      rank: dto.rank ?? 100,
    });
    return this.positionsRepository.save(position);
  }
}
