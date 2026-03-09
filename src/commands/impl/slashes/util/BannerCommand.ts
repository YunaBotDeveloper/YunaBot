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
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {EmbedColors} from '../../../../util/EmbedColors';

export default class BannerCommand extends Command {
  constructor() {
    super('banner', 'Lấy ảnh bìa');

    this.advancedOptions.cooldown = 10000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người dùng bạn chỉ định')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('memberEmoji');

    const loadingContainer = StatusContainer.loading(loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const targetUser = await (
      interaction.options.getUser('user') || interaction.user
    ).fetch(true);
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const isGlobalBannerAnimated = targetUser.banner?.startsWith('a_');
    const isGuildBannerAnimated = member?.banner?.startsWith('a_');

    const globalBanner = targetUser.bannerURL({
      size: 4096,
      extension: isGlobalBannerAnimated ? 'gif' : 'png',
    });

    if (!globalBanner) {
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        `${userMention(targetUser.id)} không có ảnh bìa.`,
      );

      const message = await interaction.editReply({
        components: [errorContainer],
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 5000);

      return;
    }

    const guildBanner = member?.bannerURL({
      size: 4096,
      extension: isGuildBannerAnimated ? 'gif' : 'png',
    });

    const hasGuildBanner =
      member && guildBanner && guildBanner !== globalBanner;

    let deleteAt = new Date(Date.now() + 60000);

    if (hasGuildBanner) {
      const componentIds: string[] = [
        `banner_global_${interaction.id}`,
        `banner_guild_${interaction.id}`,
      ];
      const bannerContainer = this.bannerContainer(
        infoEmoji,
        memberEmoji,
        targetUser.id,
        true,
        'guild',
        globalBanner,
        guildBanner,
        componentIds,
        deleteAt,
      );

      const message = await interaction.editReply({
        components: [bannerContainer],
      });

      ComponentManager.getComponentManager().register([
        {
          customId: componentIds[0],
          timeout: 60000,
          onTimeout: async () => {
            ComponentManager.getComponentManager().unregisterMany([
              componentIds[0],
              componentIds[1],
            ]);

            await message.delete().catch(() => null);
          },
          handler: async (interaction: ButtonInteraction) => {
            ComponentManager.getComponentManager().unregister(componentIds[1]);

            deleteAt = new Date(Date.now() + 60000);

            const bannerContainer = this.bannerContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'global',
              globalBanner,
              guildBanner,
              componentIds,
              deleteAt,
            );

            await interaction.update({components: [bannerContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: componentIds[1],
          timeout: 60000,
          onTimeout: async () => {
            ComponentManager.getComponentManager().unregisterMany([
              componentIds[0],
              componentIds[1],
            ]);

            await message.delete().catch(() => null);
          },
          handler: async (interaction: ButtonInteraction) => {
            ComponentManager.getComponentManager().unregister(componentIds[0]);

            deleteAt = new Date(Date.now() + 60000);

            const bannerContainer = this.bannerContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'guild',
              globalBanner,
              guildBanner,
              componentIds,
              deleteAt,
            );

            await interaction.update({components: [bannerContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
      ]);
    } else {
      const bannerContainer = this.bannerContainer(
        infoEmoji,
        memberEmoji,
        targetUser.id,
        false,
        'global',
        globalBanner,
        undefined,
        [],
        deleteAt,
      );

      const message = await interaction.editReply({
        components: [bannerContainer],
        allowedMentions: {},
      });

      setTimeout(async () => {
        await message.delete().catch(() => null);
      }, 60000);
    }
  }

  private bannerContainer(
    infoEmoji: unknown,
    memberEmoji: unknown,
    userId: string,
    hasGuildBanner: boolean,
    active: 'global' | 'guild',
    globalBanner: string,
    guildBanner: string | undefined,
    componentIds: string[],
    deleteAt: Date,
  ): ContainerBuilder {
    const isGuild = active === 'guild' && hasGuildBanner;
    const bannerUrl = isGuild ? guildBanner! : globalBanner;

    const titleText = `## ${memberEmoji} Ảnh bìa của ${userMention(userId)}`;
    const typeText = `**Loại:** ${inlineCode(isGuild ? 'Ảnh bìa trong máy chủ' : 'Ảnh bìa toàn Discord')}`;
    const deleteText = `${String(infoEmoji)} Tin nhắn này sẽ tự động xoá trong ${time(deleteAt, TimestampStyles.RelativeTime)}`;

    if (hasGuildBanner && componentIds.length === 2) {
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
          gallery.addItems(item => item.setURL(bannerUrl)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext(
                  active === 'global'
                    ? 'Bấm vào đây để hiển thị ảnh bìa trong máy chủ'
                    : 'Bấm vào đây để hiển thị ảnh bìa toàn Discord',
                ),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(
                  active === 'global' ? componentIds[1] : componentIds[0],
                )
                .setLabel('Đổi loại ảnh bìa')
                .setStyle(ButtonStyle.Success),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext('Bấm vào đây để tải ảnh bìa'),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Tải xuống')
                .setStyle(ButtonStyle.Link)
                .setURL(bannerUrl),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(deleteText),
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
          gallery.addItems(item => item.setURL(bannerUrl)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext('Bấm vào đây để tải ảnh bìa'),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Tải xuống')
                .setURL(bannerUrl)
                .setStyle(ButtonStyle.Link),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(deleteText),
        );
    }
  }
}
