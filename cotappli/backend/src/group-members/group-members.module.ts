import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupMembersService } from './group-members.service';
import { GroupMembersController } from './group-members.controller';

@Module({
  imports: [AuthModule],
  controllers: [GroupMembersController],
  providers: [GroupMembersService],
})
export class GroupMembersModule {}
