import { RequiredEntityData } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { GenericCrudService } from '@common/factory/generic-crud.service';
import { User, UserSchema } from './user.schema';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Injectable()
export class UsersService extends GenericCrudService<User> {
  constructor(
    @InjectRepository(UserSchema)
    repository: EntityRepository<User>,
  ) {
    super(repository);
  }

  /** Creates a user, hashing the password if one is provided. */
  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.repository.findOne({
      email: dto.email.toLowerCase(),
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const data: RequiredEntityData<User> = {
      name: dto.name,
      email: dto.email.toLowerCase(),
      role: dto.role,
      isActive: dto.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    return this.create(data);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const data: Partial<User> = { updatedAt: new Date() };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await argon2.hash(dto.password);

    return this.update({ id }, data);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ email: email.toLowerCase() });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return argon2.verify(user.passwordHash, password);
  }
}
