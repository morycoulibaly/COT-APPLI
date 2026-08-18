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

    // Règle mise à jour : un versement daté dans le passé est normal (paiement déjà
    // effectué, y compris via un reçu Mobile Money scanné). Ce qui n'a pas de sens,
    // en revanche, c'est un versement daté dans le futur.
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const paymentDate = new Date(dto.paymentDate);
    if (paymentDate > endOfToday) {
      throw new BadRequestException('La date du versement ne peut pas être dans le futur.');
    }

    return this.prisma.contribution.create({
      data: {
        groupId,
        memberId: dto.memberId,
        amount: dto.amount,
        paymentDate,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        senderName: dto.senderName,
        transactionReference: dto.transactionReference,
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