import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: InstanceType<typeof PrismaClient>;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  get user() {
    return this.client.user;
  }

  get incomingEmail() {
    return this.client.incomingEmail;
  }

  get video() {
    return this.client.video;
  }

  get landing() {
    return this.client.landing;
  }

  get shortLink() {
    return this.client.shortLink;
  }

  get sentEmail() {
    return this.client.sentEmail;
  }

  get quickLink() {
    return this.client.quickLink;
  }

  get quickLinkVisit() {
    return this.client.quickLinkVisit;
  }

  get landingVisit() {
    return this.client.landingVisit;
  }

  // Messaging models
  get contact() {
    return this.client.contact;
  }

  get contactChannel() {
    return this.client.contactChannel;
  }

  get contactMerge() {
    return this.client.contactMerge;
  }

  get contactCustomField() {
    return this.client.contactCustomField;
  }

  get channel() {
    return this.client.channel;
  }

  get channelConfig() {
    return this.client.channelConfig;
  }

  get conversation() {
    return this.client.conversation;
  }

  get conversationTag() {
    return this.client.conversationTag;
  }

  get conversationAssignment() {
    return this.client.conversationAssignment;
  }

  get conversationSla() {
    return this.client.conversationSla;
  }

  get message() {
    return this.client.message;
  }

  get messageStatusEvent() {
    return this.client.messageStatusEvent;
  }

  get messageAttachment() {
    return this.client.messageAttachment;
  }

  get messageReaction() {
    return this.client.messageReaction;
  }

  get messageGeolocation() {
    return this.client.messageGeolocation;
  }

  get internalNote() {
    return this.client.internalNote;
  }

  get tag() {
    return this.client.tag;
  }

  get template() {
    return this.client.template;
  }

  get templateVariable() {
    return this.client.templateVariable;
  }

  get msgQuickReply() {
    return this.client.msgQuickReply;
  }

  get autoReplyRule() {
    return this.client.autoReplyRule;
  }

  get team() {
    return this.client.team;
  }

  get teamMember() {
    return this.client.teamMember;
  }

  get notification() {
    return this.client.notification;
  }

  get webhookEvent() {
    return this.client.webhookEvent;
  }

  get outboundJob() {
    return this.client.outboundJob;
  }

  get outboundJobLog() {
    return this.client.outboundJobLog;
  }

  get typingIndicator() {
    return this.client.typingIndicator;
  }

  async $queryRaw(query: TemplateStringsArray, ...values: unknown[]) {
    return this.client.$queryRaw(query, ...values);
  }

  async $transaction(fn: Parameters<typeof this.client.$transaction>[0]) {
    return this.client.$transaction(fn as never);
  }
}
