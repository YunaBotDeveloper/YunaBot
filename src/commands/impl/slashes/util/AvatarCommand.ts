import {Command} from '../../../Command';
import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  subtext,
  time,
  TimestampStyles,
  userMention,
} from 'discord.js';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class AvatarCommand extends Command {
  constructor() {
    super('avatar', 'Lấy ảnh đại diện');

    this.advancedOptions.cooldown = 10000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người dùng bạn chỉ định')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');
    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const isGlobalAvatarAnimated = targetUser.avatar?.startsWith('a_');
    const isGuildAvatarAnimated = member?.avatar?.startsWith('a_');

    const globalAvatar = targetUser.displayAvatarURL({
      size: 4096,
      extension: isGlobalAvatarAnimated ? 'gif' : 'png',
    });

    const guildAvatar = member?.displayAvatarURL({
      size: 4096,
      extension: isGuildAvatarAnimated ? 'gif' : 'png',
    });

    const hasGuildAvatar =
      member && guildAvatar && guildAvatar !== globalAvatar;

    let deleteAt = new Date(Date.now() + 60000);

    if (hasGuildAvatar) {
      const componentIds: string[] = [
        `avatar_global_${interaction.id}`,
        `avatar_guild_${interaction.id}`,
      ];

      const avatarContainer = this.avatarContainer(
        infoEmoji,
        memberEmoji,
        targetUser.id,
        true,
        'guild',
        globalAvatar,
        guildAvatar,
        componentIds,
        deleteAt,
      );

      const message = await interaction.editReply({
        components: [avatarContainer],
      });

      ComponentManager.getComponentManager().register([
        {
          customId: componentIds[0],
          timeout: 60000,
          onTimeout: async (): Promise<void> => {
            ComponentManager.getComponentManager().unregisterMany([
              componentIds[0],
              componentIds[1],
            ]);
            await message.delete().catch(() => null);
          },
          handler: async (interaction: ButtonInteraction): Promise<void> => {
            ComponentManager.getComponentManager().unregister(componentIds[1]);

            deleteAt = new Date(Date.now() + 60000);

            const avatarContainer = this.avatarContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'global',
              globalAvatar,
              guildAvatar,
              componentIds,
              deleteAt,
            );

            await interaction.update({components: [avatarContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: componentIds[1],
          timeout: 60000,
          onTimeout: async (): Promise<void> => {
            ComponentManager.getComponentManager().unregisterMany([
              componentIds[0],
              componentIds[1],
            ]);
            await message.delete().catch(() => null);
          },
          handler: async (interaction: ButtonInteraction) => {
            ComponentManager.getComponentManager().unregister(componentIds[0]);

            deleteAt = new Date(Date.now() + 60000);

            const avatarContainer = this.avatarContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'guild',
              globalAvatar,
              guildAvatar,
              componentIds,
              deleteAt,
            );

            await interaction.update({components: [avatarContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
      ]);
    } else {
      const avatarContainer = this.avatarContainer(
        infoEmoji,
        memberEmoji,
        targetUser.id,
        false,
        'global',
        globalAvatar,
        undefined,
        [],
        deleteAt,
      );

      const message = await interaction.editReply({
        components: [avatarContainer],
        allowedMentions: {},
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 60000);
    }
  }

  private avatarContainer(
    infoEmoji: unknown,
    memberEmoji: unknown,
    userId: string,
    hasGuildAvatar: boolean,
    active: 'global' | 'guild',
    globalAvatar: string,
    guildAvatar: string | undefined,
    componentIds: string[],
    deleteAt: Date,
  ): ContainerBuilder {
    const isGuild = active === 'guild' && hasGuildAvatar;
    const avatarUrl = isGuild ? guildAvatar! : globalAvatar;

    const titleText = `## ${memberEmoji} Ảnh đại diện của ${userMention(userId)}`;
    const typeText = `**Loại:** ${inlineCode(isGuild ? 'Ảnh đại diện trong máy chủ' : 'Ảnh đại diện toàn Discord')}`;
    const deleteText = `${String(infoEmoji)} Tin nhắn này sẽ tự động xoá trong ${time(deleteAt, TimestampStyles.RelativeTime)}`;

    if (hasGuildAvatar && componentIds.length === 2) {
      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(titleText),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(typeText),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(avatarUrl)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext(
                  active === 'global'
                    ? 'Bấm vào đây để hiển thị ảnh đại diện trong máy chủ'
                    : 'Bấm vào đây để hiển thị ảnh đại diện toàn Discord',
                ),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(
                  active === 'global' ? componentIds[1] : componentIds[0],
                )
                .setLabel('Đổi loại ảnh đại diện')
                .setStyle(ButtonStyle.Success),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext('Bấm vào đây để tải ảnh đại diện'),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Tải xuống')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarUrl),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(subtext(deleteText)),
        );
    } else {
      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(titleText),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(typeText),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(avatarUrl)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext('Bấm vào đây để tải ảnh đại diện'),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Tải xuống')
                .setURL(avatarUrl)
                .setStyle(ButtonStyle.Link),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(subtext(deleteText)),
        );
    }
  }
}
