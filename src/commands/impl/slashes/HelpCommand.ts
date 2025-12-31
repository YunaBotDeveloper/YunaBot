import {
  ActionRowBuilder,
  quote,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  GuildMember,
  inlineCode,
  MessageFlags,
  PermissionsBitField,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  subtext,
} from 'discord.js';
import {Command} from '../../Command';
import {EmbedColors} from '../../../util/EmbedColors';
import ExtendedClient from '../../../classes/ExtendedClient';
import Config from '../../../config/Config';
import ComponentManager from '../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../enum/ComponentEnum';

interface CommandCategory {
  name: string;
  emoji: string;
  description: string;
  commands: string[];
}

export default class HelpCommand extends Command {
  constructor() {
    super('help', 'Hiển thị toàn bộ lệnh');

    this.advancedOptions.cooldown = 5000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const prefix = Config.getInstance().prefix || '/';

    const slashCommands = client.commandManager.getAllSlashCommand();
    const totalCommands = slashCommands.length;

    const member = interaction.member as GuildMember | null;
    const memberPermissions = member?.permissions;

    const forYouCount = slashCommands.filter(cmd => {
      const requiredPermissions = cmd.data.default_member_permissions;
      if (!requiredPermissions) return true;

      if (memberPermissions) {
        const permBitField = new PermissionsBitField(
          // eslint-disable-next-line n/no-unsupported-features/es-builtins
          BigInt(requiredPermissions),
        );
        return memberPermissions.has(permBitField);
      }

      return false;
    }).length;

    // Dynamically generate categories based on commands
    const categoriesMap = new Map<string, CommandCategory>();

    slashCommands.forEach(cmd => {
      const permissions = cmd.data.default_member_permissions;
      let categoryName: string;
      let categoryEmoji: string;
      let categoryDescription: string;

      if (cmd.data.name === 'help') {
        categoryName = 'Thông tin';
        categoryEmoji = '📖';
        categoryDescription = 'Các lệnh thông tin';
      } else if (
        permissions &&
        // eslint-disable-next-line n/no-unsupported-features/es-builtins
        new PermissionsBitField(BigInt(permissions)).has(
          PermissionFlagsBits.ManageChannels,
        )
      ) {
        categoryName = 'Quản lý kênh';
        categoryEmoji = '🔧';
        categoryDescription = 'Các lệnh quản lý kênh';
      } else if (
        permissions &&
        // eslint-disable-next-line n/no-unsupported-features/es-builtins
        new PermissionsBitField(BigInt(permissions)).has(
          PermissionFlagsBits.ManageGuild,
        )
      ) {
        categoryName = 'Quản lý server';
        categoryEmoji = '🛡️';
        categoryDescription = 'Các lệnh quản lý server';
      } else if (
        permissions &&
        // eslint-disable-next-line n/no-unsupported-features/es-builtins
        new PermissionsBitField(BigInt(permissions)).has(
          PermissionFlagsBits.ModerateMembers,
        )
      ) {
        categoryName = 'Moderation';
        categoryEmoji = '👮';
        categoryDescription = 'Các lệnh kiểm duyệt';
      } else {
        categoryName = 'Tiện ích';
        categoryEmoji = '⚙️';
        categoryDescription = 'Các lệnh tiện ích';
      }

      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, {
          name: categoryName,
          emoji: categoryEmoji,
          description: categoryDescription,
          commands: [],
        });
      }

      categoriesMap.get(categoryName)!.commands.push(cmd.data.name);
    });

    const CATEGORIES = Array.from(categoriesMap.values());

    const categoryList = CATEGORIES.map(cat =>
      quote(`${cat.emoji} » **${cat.name}**`),
    ).join('\n');

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

    const helpContainer = new ContainerBuilder()
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent('## YunaBot v2\n'),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          quote(
            `Bot có ${inlineCode(totalCommands.toString())} lệnh | Bạn có thể dùng ${inlineCode(forYouCount.toString())} lệnh`,
          ),
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`Các tính năng của bot:\n ${categoryList}`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            '- Để xem lệnh có trong tính năng, vui lòng sử dụng hộp thoại phía dưới.',
          ),
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          subtext(
            '- Để được hỗ trợ vui lòng bấm vào [đây](https://discord.gg/djs)',
          ),
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addActionRowComponents(row => row.addComponents(selectMenu));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    await interaction.reply({
      components: [helpContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // Fetch application commands to get IDs
    const applicationCommands = await client.application?.commands.fetch();

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
                  .map(cmd => {
                    const commandId = applicationCommands?.find(
                      c => c.name === cmd.data.name,
                    )?.id;
                    const mention = commandId
                      ? `</${cmd.data.name}:${commandId}>`
                      : `\`/${cmd.data.name}\``;
                    return `${mention} - ${cmd.data.description}`;
                  })
                  .join('\n')
              : 'Không có lệnh nào trong danh mục này.';

          const backButton = new ButtonBuilder()
            .setCustomId('help-back-button')
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('◀️');

          const categoryContainer = new ContainerBuilder()
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(`## ${category.emoji} ${category.name}\n`),
            )
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(quote(category.description)),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(`**Commands:**\n${commandList}`),
            )
            .addSeparatorComponents(seperator => seperator)
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext('• Select a category from the dropdown below.'),
              ),
            )
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext(
                  '• [Support](https://discord.gg/yourserver) | [Invite](https://discord.com/oauth2/authorize)',
                ),
              ),
            )
            .addSeparatorComponents(seperator => seperator)
            .addActionRowComponents(row => row.addComponents(backButton));

          await menuInteraction.update({
            components: [categoryContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        },
      },
      {
        customId: 'help-back-button',
        type: ComponentEnum.BUTTON,
        userCheck: [interaction.user.id],
        timeout: TIMEOUT_MS,
        onTimeout: async () => {
          // Handled by menu timeout
        },
        handler: async (buttonInteraction: any) => {
          await buttonInteraction.update({
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        },
      },
    ]);
  }
}
