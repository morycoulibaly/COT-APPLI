import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, groupId: string, dto: CreateContributionDto) {
    await this.assertGroupOwnership(ownerId, groupId);

    // Pas de clôture automatique : une cotisation peut dépasser son objectif,
    // le groupe peut accueillir de nouveaux membres à tout moment, et rien n'oblige
    // que tout le monde cotise. On accepte donc toujours de nouveaux versements.

    const member = await this.prisma.groupMember.findUnique({ where: { id: dto.memberId } });
    if (!member || member.groupId !== groupId) {
      throw new NotFoundException("Ce membre n'appartient pas à ce groupe");
    }

    // Règle demandée : la date du versement ne peut pas être antérieure à aujourd'hui.
    // (Si vous vouliez en réalité interdire les dates FUTURES plutôt que passées,
    // inversez simplement la comparaison ci-dessous : paymentDate > startOfToday.)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const paymentDate = new Date(dto.paymentDate);
    if (paymentDate < startOfToday) {
      throw new BadRequestException(
        'La date du versement ne peut pas être antérieure à la date du jour.',
      );
    }

    return this.prisma.contribution.create({
      data: {
        groupId,
        memberId: dto.memberId,
        amount: dto.amount,
        paymentDate,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
      },
    });
  }

  // Journal d'historique complet du groupe, du plus récent au plus ancien
  async findAllForGroup(ownerId: string, groupId: string) {
    await this.assertGroupOwnership(ownerId, groupId);
    return this.prisma.contribution.findMany({
      where: { groupId },
      include: { member: { select: { displayName: true } } },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async remove(ownerId: string, groupId: string, contributionId: string) {
    await this.assertGroupOwnership(ownerId, groupId);
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
    });
    if (!contribution || contribution.groupId !== groupId) {
      throw new NotFoundException('Versement introuvable');
    }
    await this.prisma.contribution.delete({ where: { id: contributionId } });
    return { success: true };
  }

  private async assertGroupOwnership(ownerId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable');
    if (group.ownerId !== ownerId) throw new ForbiddenException('Accès refusé à ce groupe');
    return group;
  }
}