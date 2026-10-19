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
