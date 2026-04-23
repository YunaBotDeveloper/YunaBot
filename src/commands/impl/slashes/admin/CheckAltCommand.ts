import {
  bold,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  PermissionFlagsBits,
  subtext,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {AltDetector} from 'discord-alt-detector';

export default class CheckAltCommand extends Command {
  constructor() {
    super('checkalt', 'Check if a user is potentially an alt account.');

    this.advancedOptions.cooldown = 5000;
    this.data.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check')
        .setRequired(true),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const client = interaction.client as ExtendedClient;
    const targetUser = interaction.options.getUser('user', true);

    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');

    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.editReply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (!interaction.guild) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'This command can only be used in a server!',
      );
      await interaction.editReply({components: [errorContainer]});
      return;
    }

    const member = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!member) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'User not found in this server!',
      );
      await interaction.editReply({components: [errorContainer]});
      return;
    }

    const altDetector = new AltDetector();
    const result = altDetector.check(member);
    const category = altDetector.getCategory(result);

    const trustColor =
      category === 'highly-trusted'
        ? 0x22c55e
        : category === 'trusted'
          ? 0x3b82f6
          : category === 'normal'
            ? 0xeab308
            : category === 'newbie'
              ? 0xf97316
              : 0xef4444;

    const container = new ContainerBuilder()
      .setAccentColor(trustColor)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${infoEmoji} Alt Account Check: ${userMention(targetUser.id)}`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `${bold('Category:')} ${inlineCode(category.toUpperCase())}\n` +
            `${bold('Total Score:')} ${result.total}/100 (lower is more trusted)`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          '### Breakdown\n' +
            `Account Age: ${result.categories.age} points\n` +
            `Status: ${result.categories.status} points\n` +
            `Activity: ${result.categories.activity} points\n` +
            `Username Words: ${result.categories.usernameWords} points\n` +
            `Username Symbols: ${result.categories.usernameSymbols} points\n` +
            `Display Name Words: ${result.categories.displaynameWords} points\n` +
            `Display Name Caps: ${result.categories.displaynameCaps} points\n` +
            `Display Name Symbols: ${result.categories.displaynameSymbols} points\n` +
            `Flags/Badges: ${result.categories.flags} points\n` +
            `Nitro/Booster: ${result.categories.booster} points\n` +
            `Avatar (PFP): ${result.categories.pfp} points\n` +
            `Banner: ${result.categories.banner} points`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            'Note: This is a heuristic check and may produce false positives.',
          ),
        ),
      );

    await interaction.editReply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  }
}
