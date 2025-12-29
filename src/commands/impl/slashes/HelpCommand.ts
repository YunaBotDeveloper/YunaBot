import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import {Command} from '../../Command';
import {EmbedColors} from '../../../util/EmbedColors';
import ExtendedClient from '../../../classes/ExtendedClient';
import Config from '../../../config/Config';
import ComponentManager from '../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../enum/ComponentEnum';

// Define command categories with emojis
interface CommandCategory {
  name: string;
  emoji: string;
  description: string;
  commands: string[];
}

const CATEGORIES: CommandCategory[] = [
  {
    name: 'Moderation',
    emoji: '🛡️',
    description: 'Các lệnh quản lý server',
    commands: ['nuke'],
  },
  {
    name: 'Information',
    emoji: '📖',
    description: 'Các lệnh thông tin',
    commands: ['help'],
  },
  // Add more categories as needed
];

export default class HelpCommand extends Command {
  constructor() {
    super('help', 'Hiển thị toàn bộ lệnh');

    this.advancedOptions.cooldown = 5000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const prefix = Config.getInstance().prefix || '/';

    // Get command counts
    const slashCommands = client.commandManager.getAllSlashCommand();
    const totalCommands = slashCommands.length;

    // Calculate "For You" count - commands the user has permission to use
    const member = interaction.member as GuildMember | null;
    const memberPermissions = member?.permissions;

    const forYouCount = slashCommands.filter(cmd => {
      const requiredPermissions = cmd.data.default_member_permissions;
      // If no permissions required, command is available to everyone
      if (!requiredPermissions) return true;

      // Check if user has the required permissions
      if (memberPermissions) {
        const permBitField = new PermissionsBitField(
          // eslint-disable-next-line n/no-unsupported-features/es-builtins
          BigInt(requiredPermissions),
        );
        return memberPermissions.has(permBitField);
      }

      return false;
    }).length;

    // Build category list with proper formatting like the image
    const categoryList = CATEGORIES.map(
      cat => `${cat.emoji} » **${cat.name}**`,
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(EmbedColors.blue())
      .setDescription(
        `**Type** \`${prefix}<cmd> ?h\` **to get detailed info**\n` +
          `**Total Cmds:** \`${totalCommands}\` | **For You:** \`${forYouCount}\`\n\n` +
          '`<>` - Required Argument **|** `[]` - Optional Argument\n\n' +
          '**Main Modules**\n' +
          `${categoryList}\n\n` +
          '• Select a category from the dropdown below.\n' +
          '• [Support](https://discord.gg/yourserver) | [Invite](https://discord.com/oauth2/authorize)',
      )
      .setFooter({
        text: `Req: By ${interaction.user.displayName}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    // Build select menu for categories
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category-select')
      .setPlaceholder(interaction.user.displayName)
      .addOptions(
        CATEGORIES.map(cat => ({
          label: cat.name,
          description: cat.description,
          emoji: cat.emoji,
          value: cat.name.toLowerCase(),
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    const TIMEOUT_MS = 60000; // 1 minute

    // Register component with timeout
    ComponentManager.getComponentManager().register([
      {
        customId: 'help-category-select',
        type: ComponentEnum.MENU,
        userCheck: [interaction.user.id],
        timeout: TIMEOUT_MS,
        onTimeout: async () => {
          try {
            const disabledMenu = StringSelectMenuBuilder.from(selectMenu)
              .setDisabled(true)
              .setPlaceholder('Hết thời gian');
            const disabledRow =
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                disabledMenu,
              );
            await interaction.editReply({
              components: [disabledRow],
            });
          } catch {
            // Message may have been deleted
          }
        },
        handler: async (menuInteraction: StringSelectMenuInteraction) => {
          const selectedCategory = menuInteraction.values[0];
          const category = CATEGORIES.find(
            c => c.name.toLowerCase() === selectedCategory,
          );

          if (!category) return;

          // Get commands for this category
          const categoryCommands = slashCommands.filter(cmd =>
            category.commands.includes(cmd.data.name),
          );

          const commandList =
            categoryCommands.length > 0
              ? categoryCommands
                  .map(cmd => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
                  .join('\n')
              : 'Không có lệnh nào trong danh mục này.';

          const categoryEmbed = new EmbedBuilder()
            .setColor(EmbedColors.blue())
            .setDescription(
              `**${category.emoji} ${category.name}**\n` +
                `${category.description}\n\n` +
                `**Commands:**\n${commandList}\n\n` +
                '• Select a category from the dropdown below.\n' +
                '• [Support](https://discord.gg/yourserver) | [Invite](https://discord.com/oauth2/authorize)',
            )
            .setFooter({
              text: `Req: By ${interaction.user.displayName}`,
              iconURL: interaction.user.displayAvatarURL(),
            });

          await menuInteraction.update({
            embeds: [categoryEmbed],
            components: [row],
          });
        },
      },
    ]);
  }
}
