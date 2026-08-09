import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { GroupMembersService } from './group-members.service';
import { CreateMemberDto } from './dto/create-member.dto';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/members')
export class GroupMembersController {
  constructor(private readonly membersService: GroupMembersService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: CreateMemberDto,
  ) {
    return this.membersService.create(user.userId, groupId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload, @Param('groupId') groupId: string) {
    return this.membersService.findAll(user.userId, groupId);
  }

  @Delete(':memberId')
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.remove(user.userId, groupId, memberId);
  }
}
