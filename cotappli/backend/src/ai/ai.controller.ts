import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { GenerateReminderDto } from './dto/generate-reminder.dto';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('ai/scan-receipt')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async scanReceipt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body('text') text: string | undefined,
  ) {
    await this.assertGroupOwnership(user.userId, groupId);

    return this.aiService.scanReceipt({
      imageBase64: image ? image.buffer.toString('base64') : null,
      imageMimeType: image?.mimetype ?? null,
      text: text ?? null,
    });
  }

  @Post('members/:memberId/ai/reminder')
  async generateReminder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Body() dto: GenerateReminderDto,
  ) {
    const group = await this.assertGroupOwnership(user.userId, groupId);

    const member = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
      include: { contributions: true },
    });
    if (!member || member.groupId !== groupId) {
      throw new NotFoundException('Membre introuvable');
    }

    const totalPaid = member.contributions.reduce((sum, c) => sum + Number(c.amount), 0);
    const expectedAmount = member.expectedAmount != null ? Number(member.expectedAmount) : null;
    // Mode "cotisation fixe" : montant restant précis. Mode "libre" : pas de montant
    // attendu défini, on rappelle simplement l'objectif du groupe.
    const amountDue = expectedAmount != null ? Math.max(0, expectedAmount - totalPaid) : Number(group.targetAmount);

    const message = await this.aiService.generateReminder({
      memberName: member.displayName,
      amountDue,
      currency: group.currency,
      groupTitle: group.title,
      tone: dto.tone,
    });

    return { message };
  }

  private async assertGroupOwnership(ownerId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable');
    if (group.ownerId !== ownerId) throw new ForbiddenException('Accès refusé à ce groupe');
    return group;
  }
}