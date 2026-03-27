import { Global, Module, OnModuleInit } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { EmailProviderService } from './email/email-provider.service';
import { TelegramProviderService } from './telegram/telegram-provider.service';
import { WhatsAppProviderService } from './whatsapp/whatsapp-provider.service';
import { SmsProviderService } from './sms/sms-provider.service';

@Global()
@Module({
  providers: [
    ProviderRegistryService,
    EmailProviderService,
    TelegramProviderService,
    WhatsAppProviderService,
    SmsProviderService,
  ],
  exports: [
    ProviderRegistryService,
    EmailProviderService,
    TelegramProviderService,
    WhatsAppProviderService,
    SmsProviderService,
  ],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly emailProvider: EmailProviderService,
    private readonly telegramProvider: TelegramProviderService,
    private readonly whatsappProvider: WhatsAppProviderService,
    private readonly smsProvider: SmsProviderService,
  ) {}

  onModuleInit() {
    this.registry.register(this.emailProvider);
    this.registry.register(this.telegramProvider);
    this.registry.register(this.whatsappProvider);
    this.registry.register(this.smsProvider);
  }
}
