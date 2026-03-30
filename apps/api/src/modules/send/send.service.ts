import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSlug } from '../../common/utils/links';
import { generateShortCode } from '../../common/utils/links';
import { sendEmail } from '../../common/utils/smtp';
import { buildEmailHtml } from '../../common/utils/email-template';
import type { EmailLanguage } from '../../common/utils/email-template';
import {
  VALID_LANGUAGES,
  SUBJECT_BY_LANG,
  TITLE_BY_LANG,
  FALLBACK_NAME,
} from '../../common/utils/languages';

interface SendDto {
  emailId: string;
  videoId: string;
  personalNote?: string;
  buyButtonText?: string;
  language?: string;
}

@Injectable()
export class SendService {
  private readonly logger = new Logger(SendService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendVideoEmail(dto: SendDto, userId: string) {
    const { emailId, videoId, personalNote, buyButtonText, language } = dto;
    const lang: EmailLanguage = VALID_LANGUAGES.includes(language as EmailLanguage)
      ? (language as EmailLanguage)
      : 'pl';

    if (!emailId || !videoId) {
      throw new BadRequestException('emailId and videoId are required');
    }

    const incomingEmail = await this.prisma.incomingEmail.findUnique({
      where: { id: emailId },
    });
    if (!incomingEmail || !incomingEmail.customerEmail) {
      throw new BadRequestException('Email not found or missing customer email');
    }

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video || !video.active) {
      throw new BadRequestException('Video not found');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    try {
      // 1. Create landing page
      let slug = generateSlug();
      while (await this.prisma.landing.findUnique({ where: { slug } })) {
        slug = generateSlug();
      }

      const landing = await this.prisma.landing.create({
        data: {
          slug,
          title: TITLE_BY_LANG[lang](video.title),
          videoId: video.id,
          productUrl: incomingEmail.productUrl || '',
          buyButtonText: buyButtonText || 'Kup teraz',
          personalNote: personalNote || null,
          customerName: incomingEmail.customerName || null,
          productName: incomingEmail.productName || null,
          language: lang,
          emailId: incomingEmail.id,
          userId,
        },
      });

      // 2. Create short link
      let shortCode = generateShortCode();
      while (await this.prisma.shortLink.findUnique({ where: { code: shortCode } })) {
        shortCode = generateShortCode();
      }
      await this.prisma.shortLink.create({
        data: { code: shortCode, landingId: landing.id },
      });

      const shortUrl = `${appUrl}/r/${shortCode}`;
      const landingUrl = `${appUrl}/l/${slug}`;

      // 3. Build and send email
      const html = buildEmailHtml({
        customerName: incomingEmail.customerName || FALLBACK_NAME[lang],
        videoTitle: video.title,
        thumbnail: video.thumbnail,
        landingUrl: shortUrl,
        personalNote: personalNote || undefined,
        language: lang,
      });

      const subject = SUBJECT_BY_LANG[lang](video.title);

      let status = 'sent';
      let errorMessage: string | null = null;

      try {
        await sendEmail({
          to: incomingEmail.customerEmail,
          subject,
          html,
        });
      } catch (err) {
        status = 'failed';
        errorMessage = err instanceof Error ? err.message : 'Send failed';
      }

      // 4. Record sent email
      const sentEmail = await this.prisma.sentEmail.create({
        data: {
          to: incomingEmail.customerEmail,
          subject,
          landingId: landing.id,
          userId,
          status,
          errorMessage,
        },
      });

      // 5. Mark incoming email as processed
      await this.prisma.incomingEmail.update({
        where: { id: emailId },
        data: { processed: true, processedById: userId },
      });

      return {
        landing: { id: landing.id, slug, url: landingUrl },
        shortLink: { code: shortCode, url: shortUrl },
        sentEmail: { id: sentEmail.id, status },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        '[Send] Error:',
        error instanceof Error ? error.message : error,
      );
      throw new InternalServerErrorException('Send error');
    }
  }
}
