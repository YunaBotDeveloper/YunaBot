import {Events, Message} from 'discord.js';
import ExtendedClient from '../../classes/ExtendedClient';
import Event from '../Event';
import AIService from '../../api/ai/AIService';
import Config from '../../config/Config';
import Log4TS from '../../logger/Log4TS';

export default class AIResponsePingEvent extends Event {
  private aiService: AIService;
  private readonly logger = Log4TS.getLogger();

  constructor() {
    super(Events.MessageCreate);
    const aiConfig = Config.getInstance().ai;
    this.aiService = AIService.getInstance(
      aiConfig.apiKey,
      aiConfig.baseUrl,
      aiConfig.model,
    );
  }

  async run(client: ExtendedClient, message: Message) {
    if (!client || !client.user) return;
    if (message.author.bot) return;
    if (!message.mentions.has(client.user.id)) return;

    // Strip the bot mention from the message to get the actual user input
    const userInput = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
      .trim();

    if (!userInput) {
      await message.reply({
        content: "hey! what's up? 👋",
        allowedMentions: {users: [message.author.id]},
      });
      return;
    }

    // Show "typing..." indicator while waiting for the AI response
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    let reply: string;
    try {
      reply = await this.aiService.chat(userInput, message.author.id);
    } catch (error) {
      this.logger.error(`Unhandled error in AIService.chat: ${error}`);
      await message.reply({
        content: 'uh oh, something broke on my end 💀 try again later',
        allowedMentions: {users: [message.author.id]},
      });
      return;
    }

    await message.reply({
      content: reply,
      allowedMentions: {users: [message.author.id]},
    });
  }
}
