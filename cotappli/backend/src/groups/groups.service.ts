import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        ownerId,
        title: dto.title,
        description: dto.description,
        targetAmount: dto.targetAmount,
        currency: dto.currency ?? 'XOF',
      },
    });
  }

  // Ne retourne que les groupes appartenant à l'utilisateur connecté (isolation stricte)
  async findAllForOwner(ownerId: string) {
    const groups = await this.prisma.group.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: { members: { include: { contributions: true } } },
    });

    return groups.map((group) => this.withSummary(group));
  }

  async findOneForOwner(ownerId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { contributions: true } } },
    });

    if (!group) throw new NotFoundException('Groupe introuvable');
    if (group.ownerId !== ownerId) throw new ForbiddenException('Accès refusé à ce groupe');

    return this.withSummary(group);
  }

  async update(ownerId: string, groupId: string, dto: UpdateGroupDto) {
    await this.assertOwnership(ownerId, groupId);
    return this.prisma.group.update({ where: { id: groupId }, data: dto });
  }

  async remove(ownerId: string, groupId: string) {
    await this.assertOwnership(ownerId, groupId);
    await this.prisma.group.delete({ where: { id: groupId } });
    return { success: true };
  }

  private async assertOwnership(ownerId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable');
    if (group.ownerId !== ownerId) throw new ForbiddenException('Accès refusé à ce groupe');
    return group;
  }

  // Calcule le total collecté, le % de progression, et le statut de chaque membre
  private withSummary(group: any) {
    const allContributions = group.members.flatMap((m: any) => m.contributions);
    const totalCollected = allContributions.reduce(
      (sum: number, c: any) => sum + Number(c.amount),
      0,
    );
    const target = Number(group.targetAmount);
    const progressPercent = target > 0 ? Math.min(100, Math.round((totalCollected / target) * 100)) : 0;

    const members = group.members.map((member: any) => {
      const memberTotal = member.contributions.reduce(
        (sum: number, c: any) => sum + Number(c.amount),
        0,
      );
      return {
        id: member.id,
        displayName: member.displayName,
        phone: member.phone,
        joinedAt: member.joinedAt,
        totalPaid: memberTotal,
        // Règle simple MVP: "à jour" si le membre a versé au moins une contribution
        status: memberTotal > 0 ? 'a_jour' : 'en_retard',
      };
    });

    return {
      id: group.id,
      title: group.title,
      description: group.description,
      targetAmount: target,
      currency: group.currency,
      createdAt: group.createdAt,
      totalCollected,
      progressPercent,
      members,
    };
  }
}
