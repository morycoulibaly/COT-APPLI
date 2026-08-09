import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: CreateContributionDto,
  ) {
    return this.contributionsService.create(user.userId, groupId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload, @Param('groupId') groupId: string) {
    return this.contributionsService.findAllForGroup(user.userId, groupId);
  }

  @Delete(':contributionId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Param('contributionId') contributionId: string,
  ) {
    return this.contributionsService.remove(user.userId, groupId, contributionId);
  }
}
