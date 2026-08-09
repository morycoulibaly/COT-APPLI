import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { GroupMembersService } from './group-members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

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

  @Patch(':memberId')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(user.userId, groupId, memberId, dto);
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
