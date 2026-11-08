import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { UpdateProfileDto } from './dto/profile.dto';
import { CandidateProfileResponseDto } from './dto/profile-response.dto';
import { ProfileReadService } from './profile-read.service';
import { ProfileWriteService } from './profile-write.service';
import { toProfileDto } from './profile.presenter';

@ApiTags('profile')
@SessionAuth({ principalType: 'candidate' })
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly read: ProfileReadService,
    private readonly write: ProfileWriteService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Get the authenticated candidate's live profile",
  })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  async getProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<CandidateProfileResponseDto> {
    const profile = await this.read.getLiveProfile(req.session.principalId);
    return {
      success: true,
      message: 'Profile fetched successfully',
      data: toProfileDto(profile),
    };
  }

  @Put()
  @ApiOperation({
    summary:
      "Update the authenticated candidate's profile; snapshots live applications before changing live data",
  })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CandidateProfileResponseDto> {
    const profile = await this.write.updateProfile(
      req.session.principalId,
      dto,
    );
    return {
      success: true,
      message: 'Profile updated successfully',
      data: toProfileDto(profile),
    };
  }
}
