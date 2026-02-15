import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  subtext,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {EmbedColors} from '../../../../util/EmbedColors';
import {t, tMap} from '../../../../locale';

export default class BannerCommand extends Command {
  constructor() {
    super('banner', t('banner.description'));

    this.data.setDescriptionLocalizations(tMap('banner.description'));

    this.advancedOptions.cooldown = 10000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription(t('banner.option.user'))
        .setDescriptionLocalizations(tMap('banner.option.user'))
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const locale = interaction.locale;

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingContainer = StatusContainer.loading(locale, loadingEmoji);
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
        t('banner.failed', locale, {user: userMention(targetUser.id)}),
      );
      await interaction.editReply({
        components: [errorContainer],
      });
      return;
    }

    const guildBanner = member?.bannerURL({
      size: 4096,
      extension: isGuildBannerAnimated ? 'gif' : 'png',
    });

    const hasGuildBanner =
      member && guildBanner && guildBanner !== globalBanner;

    if (hasGuildBanner) {
      const componentIds: string[] = [
        `banner_global_${interaction.id}`,
        `banner_guild_${interaction.id}`,
      ];
      const bannerContainer = await this.bannerContainer(
        infoEmoji,
        targetUser.id,
        true,
        'guild',
        globalBanner,
        guildBanner,
        componentIds,
      );

      await interaction.editReply({
        components: [bannerContainer],
      });

      ComponentManager.getComponentManager().register([
        {
          customId: componentIds[0],
          handler: async (interaction: ButtonInteraction) => {
            const bannerContainer = await this.bannerContainer(
              infoEmoji,
              targetUser.id,
              true,
              'global',
              globalBanner,
              guildBanner,
              componentIds,
            );

            await interaction.update({components: [bannerContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: componentIds[1],
          handler: async (interaction: ButtonInteraction) => {
            const bannerContainer = await this.bannerContainer(
              infoEmoji,
              targetUser.id,
              true,
              'guild',
              globalBanner,
              guildBanner,
              componentIds,
            );

            await interaction.update({components: [bannerContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
      ]);
    } else {
      const bannerContainer = await this.bannerContainer(
        infoEmoji,
        targetUser.id,
        false,
        'global',
        globalBanner,
        undefined,
        [],
      );

      await interaction.editReply({
        components: [bannerContainer],
        allowedMentions: {},
      });
    }
  }

  private async bannerContainer(
    infoEmoji: unknown,
    userId: string,
    hasGuildBanner: boolean,
    active: 'global' | 'guild',
    globalBanner: string,
    guildBanner: string | undefined,
    componentIds: string[],
  ): Promise<ContainerBuilder> {
    const isGuild = active === 'guild' && hasGuildBanner;
    const bannerUrl = isGuild ? guildBanner! : globalBanner;

    if (hasGuildBanner && componentIds.length === 2) {
      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${infoEmoji} Ảnh bìa của ${userMention(userId)}`,
          ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `**Loại:** ${inlineCode(isGuild ? 'Ảnh bìa trong máy chủ' : 'Ảnh bìa toàn Discord')}`,
          ),
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
              textDisplay.setContent(subtext('Bấm vào đây để tải ảnh bìa')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Tải xuống')
                .setStyle(ButtonStyle.Link)
                .setURL(bannerUrl),
            ),
        );
    } else {
      return new ContainerBuilder()
        .setAccentColor(EmbedColors.random())
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `## ${infoEmoji} Ảnh bìa của ${userMention(userId)}`,
          ),
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            `**Loại:** ${inlineCode('Ảnh bìa toàn Discord')}`,
          ),
        )
        .addSeparatorComponents(separator => separator)
        .addMediaGalleryComponents(gallery =>
          gallery.addItems(item => item.setURL(bannerUrl)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Bấm vào đây để tải ảnh bìa')),
            )
            .setButtonAccessory(button =>
              button
                .setLabel('Tải xuống')
                .setURL(bannerUrl)
                .setStyle(ButtonStyle.Link),
            ),
        );
    }
  }
}
