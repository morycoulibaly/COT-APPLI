import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReminderTone } from './dto/generate-reminder.dto';

export interface ReceiptScanResult {
  amount: number | null;
  senderName: string | null;
  date: string | null;
  transactionId: string | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey() {
    return this.config.get<string>('GEMINI_API_KEY') ?? '';
  }

  private get model() {
    return this.config.get<string>('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite';
  }

  private async callGemini(body: unknown) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const requestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };

    let res = await fetch(url, requestInit);

    // 503 = surcharge temporaire des serveurs Google, généralement résolue en
    // quelques secondes. On retente une fois avant d'abandonner.
    if (res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      res = await fetch(url, requestInit);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(`Erreur Gemini (${res.status}): ${errText}`);

      if (res.status === 429) {
        throw new BadRequestException(
          "Quota gratuit de l'IA atteint pour aujourd'hui. Réessayez demain, ou saisissez manuellement en attendant.",
        );
      }
      throw new BadRequestException(
        "Le service d'IA est momentanément indisponible. Réessayez ou saisissez manuellement.",
      );
    }

    return res.json();
  }

  // Analyse une capture d'écran de reçu Mobile Money (ou un texte de SMS collé) et en
  // extrait les champs utiles. Utilise responseSchema pour forcer une sortie JSON fiable,
  // plutôt que de parser un texte libre qui pourrait varier d'une réponse à l'autre.
  async scanReceipt(params: {
    imageBase64: string | null;
    imageMimeType: string | null;
    text: string | null;
  }): Promise<ReceiptScanResult> {
    if (!params.imageBase64 && !params.text) {
      throw new BadRequestException('Fournissez une image ou un texte de reçu à analyser.');
    }

    const parts: Record<string, unknown>[] = [];
    if (params.imageBase64) {
      parts.push({
        inline_data: { mime_type: params.imageMimeType ?? 'image/jpeg', data: params.imageBase64 },
      });
    }
    parts.push({
      text: `Voici ${params.imageBase64 ? "une capture d'écran" : 'le texte'} d'un reçu de paiement Mobile Money (Wave, Orange Money ou MTN Money)${
        params.text ? ` : "${params.text}"` : ''
      }. Extrais le montant, le nom ou numéro de l'expéditeur, la date du paiement (au format YYYY-MM-DD), et l'identifiant de transaction. Si une information est illisible ou absente, laisse le champ correspondant vide/null. N'invente jamais une valeur que tu ne peux pas lire avec certitude.`,
    });

    const data = await this.callGemini({
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: 300,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', nullable: true },
            senderName: { type: 'STRING', nullable: true },
            date: { type: 'STRING', nullable: true },
            transactionId: { type: 'STRING', nullable: true },
          },
          required: ['amount', 'senderName', 'date', 'transactionId'],
        },
      },
    });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    try {
      return JSON.parse(raw);
    } catch {
      throw new BadRequestException(
        "Impossible d'analyser ce reçu automatiquement. Saisissez les informations manuellement.",
      );
    }
  }

  // Génère un message de relance WhatsApp personnalisé selon le ton choisi.
  async generateReminder(params: {
    memberName: string;
    amountDue: number | null;
    currency: string;
    groupTitle: string;
    tone: ReminderTone;
  }) {
    const toneInstructions: Record<ReminderTone, string> = {
      amical:
        "Ton amical et léger, avec un peu d'humour et éventuellement un emoji, comme un message entre proches. 2 à 3 phrases maximum.",
      nouchi:
        "Ton Nouchi (argot ivoirien courant), chaleureux et direct, comme un message entre membres d'un même groupe. 2 à 3 phrases maximum.",
      formel:
        "Ton formel et respectueux, adapté à une communication d'association. Commence par une formule de politesse. 3 à 4 phrases maximum.",
    };

    // Si aucun montant précis n'est dû (cotisation en mode libre), on ne demande pas
    // à l'IA d'en inventer un — le message reste incitatif sans chiffre.
    const amountClause = params.amountDue != null
      ? `qui doit encore verser ${params.amountDue} ${params.currency}`
      : `qui n'a pas encore cotisé`;

    const prompt = `Rédige un message WhatsApp de relance de cotisation pour ${params.memberName}, ${amountClause} pour la cotisation "${params.groupTitle}". ${toneInstructions[params.tone]} Réponds UNIQUEMENT avec le texte du message, sans guillemets ni préambule.${
      params.amountDue == null ? ' Ne mentionne aucun montant précis puisqu’aucun montant fixe n’est défini pour ce membre.' : ''
    }`;

    const data = await this.callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 200 },
    });

    const message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!message) {
      throw new BadRequestException('Impossible de générer le message. Réessayez.');
    }
    return message;
  }
} 