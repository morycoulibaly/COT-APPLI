import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class GroupMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, groupId: string, dto: CreateMemberDto) {
    await this.assertGroupOwnership(ownerId, groupId);
    return this.prisma.groupMember.create({
      data: {
        groupId,
        displayName: dto.displayName,
        phone: dto.phone,
        expectedAmount: dto.expectedAmount,
      },
    });
  }

  async update(ownerId: string, groupId: string, memberId: string, dto: UpdateMemberDto) {
    await this.assertGroupOwnership(ownerId, groupId);
    const member = await this.prisma.groupMember.findUnique({ where: { id: memberId } });
    if (!member || member.groupId !== groupId) throw new NotFoundException('Membre introuvable');
    return this.prisma.groupMember.update({
      where: { id: memberId },
      data: {
        displayName: dto.displayName,
        phone: dto.phone,
        expectedAmount: dto.expectedAmount,
      },
    });
  }

  async findAll(ownerId: string, groupId: string) {
    await this.assertGroupOwnership(ownerId, groupId);
    return this.prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async remove(ownerId: string, groupId: string, memberId: string) {
    await this.assertGroupOwnership(ownerId, groupId);
    const member = await this.prisma.groupMember.findUnique({ where: { id: memberId } });
    if (!member || member.groupId !== groupId) throw new NotFoundException('Membre introuvable');
    await this.prisma.groupMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  private async assertGroupOwnership(ownerId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable');
    if (group.ownerId !== ownerId) throw new ForbiddenException('Accès refusé à ce groupe');
    return group;
  }
}
