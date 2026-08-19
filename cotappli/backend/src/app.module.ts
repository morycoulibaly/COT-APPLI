import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { GroupMembersModule } from './group-members/group-members.module';
import { ContributionsModule } from './contributions/contributions.module';
import { PublicModule } from './public/public.module';
import { AiModule } from './ai/ai.module';
import { FriendlyThrottlerGuard } from './common/guards/friendly-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    GroupsModule,
    GroupMembersModule,
    ContributionsModule,
    PublicModule,
    AiModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: FriendlyThrottlerGuard }],
})
export class AppModule {}