import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@common/constants/enums';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'Jane Recruiter' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'jane@company.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.RECRUITER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  override name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  override role?: UserRole;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  override isActive?: boolean;
}

/**
 * Frontend-facing shape of an internal user.
 *
 * Deliberately explicit: the persisted entity carries credential material
 * (`passwordHash`) and must never be serialized straight to a response.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ example: 'Jane Recruiter' })
  name?: string;

  @ApiProperty({ example: 'jane@company.com' })
  email!: string;

  @ApiPropertyOptional({ enum: UserRole })
  role?: UserRole;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: string;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({
    example: {
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 20,
      totalPages: 1,
      currentPage: 1,
    },
  })
  meta!: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}
