import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';

@Module({
  imports: [AuthModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
