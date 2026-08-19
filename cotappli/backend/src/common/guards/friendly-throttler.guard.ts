import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class FriendlyThrottlerGuard extends ThrottlerGuard {
  // Remplace le message technique par défaut ("ThrottlerException: Too Many
  // Requests") par un message clair, affiché tel quel côté frontend 
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(
      'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.',
    );
  }
}