import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

// Aucun @UseGuards ici : cette route est volontairement accessible sans compte,
// pour les participants non-inscrits qui suivent une cotisation via un lien partagé.
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get(':shareToken')
  findByShareToken(@Param('shareToken') shareToken: string) {
    return this.publicService.findByShareToken(shareToken);
  }
}
