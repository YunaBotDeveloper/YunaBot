import {ChatInputCommandInteraction} from 'discord.js';
import {Command} from '../../../Command';

export default class BannerCommand extends Command {
  constructor() {
    super('banner', 'Yep another banner command');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('User you want see')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return;

    await interaction.deferReply();

    const targetUser =
      interaction.options.getUser('user')?.fetch(true) ||
      interaction.user.fetch(true);
    const targetMember = interaction.options.getUser('user')
      ? interaction.options.getMember('user')
      : interaction.member;

    const globalBanner = targetUser.bannerURL({
      size: 4096,
      extension: 'png',
    });

    const guildBanner =
      targetMember?.displayBannerURL({
        size: 4096,
        extension: 'png',
      }) ?? undefined;

    const deleteAt = new Date(Date.now() + 60_000);
  }
}
