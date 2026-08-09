import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async findByShareToken(token: string) {
    const group = await this.prisma.group.findUnique({
      where: { shareToken: token },
      include: {
        owner: { select: { fullName: true } },
        members: { include: { contributions: true } },
      },
    });

    if (!group) throw new NotFoundException('Cette cotisation est introuvable ou le lien a expiré.');

    const totalCollected = group.members
      .flatMap((m) => m.contributions)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const target = Number(group.targetAmount);
    const progressPercent = target > 0 ? Math.round((totalCollected / target) * 100) : 0;

    // On expose volontairement le minimum : ni ownerId, ni email, ni téléphone des membres.
    const members = group.members.map((member) => {
      const totalPaid = member.contributions.reduce((sum, c) => sum + Number(c.amount), 0);
      const expectedAmount = member.expectedAmount != null ? Number(member.expectedAmount) : null;
      const isUpToDate = expectedAmount != null ? totalPaid >= expectedAmount : totalPaid > 0;
      return {
        displayName: member.displayName,
        totalPaid,
        expectedAmount,
        status: isUpToDate ? 'a_jour' : 'en_retard',
      };
    });

    return {
      title: group.title,
      description: group.description,
      organizerName: group.owner.fullName,
      targetAmount: target,
      currency: group.currency,
      status: group.status,
      paymentInstructions: group.paymentInstructions,
      totalCollected,
      progressPercent,
      members,
    };
  }
}
