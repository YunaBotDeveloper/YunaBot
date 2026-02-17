import {
  ApplicationCommandType,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  inlineCode,
  MessageFlags,
  subtext,
  UserContextMenuCommandInteraction,
  userMention,
} from 'discord.js';
import {ContextMenuCommand} from '../../../ContextMenuCommand';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {t, tMap} from '../../../../locale';

export default class BannerMenu extends ContextMenuCommand {
  constructor() {
    super(t('banner.menu.name'), ApplicationCommandType.User);

    this.data.setNameLocalizations(tMap('banner.menu.name'));

    this.advancedOptions.cooldown = 10000;
  }

  async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
    const locale = interaction.locale;

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');

    const loadingContainer = StatusContainer.loading(locale, loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    const targetUser = await interaction.targetUser.fetch(true);
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
      const bannerContainer = this.bannerContainer(
        infoEmoji,
        memberEmoji,
        targetUser.id,
        true,
        'guild',
        globalBanner,
        guildBanner,
        componentIds,
        locale,
      );

      await interaction.editReply({
        components: [bannerContainer],
      });

      ComponentManager.getComponentManager().register([
        {
          customId: componentIds[0],
          handler: async (interaction: ButtonInteraction) => {
            const bannerContainer = this.bannerContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'global',
              globalBanner,
              guildBanner,
              componentIds,
              locale,
            );

            await interaction.update({components: [bannerContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: componentIds[1],
          handler: async (interaction: ButtonInteraction) => {
            const bannerContainer = this.bannerContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'guild',
              globalBanner,
              guildBanner,
              componentIds,
              locale,
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
        locale,
      );

      await interaction.editReply({
        components: [bannerContainer],
        allowedMentions: {},
      });
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
    locale: string,
  ): ContainerBuilder {
    const isGuild = active === 'guild' && hasGuildBanner;
    const bannerUrl = isGuild ? guildBanner! : globalBanner;

    const titleText = `## ${memberEmoji} ${t('banner.title', locale, {user: userMention(userId)})}`;
    const typeText = `**${t('banner.type_label', locale)}** ${inlineCode(isGuild ? t('banner.type.guild', locale) : t('banner.type.global', locale))}`;

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
                    ? t('banner.switch_to_guild')
                    : t('banner.switch_to_global'),
                ),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(
                  active === 'global' ? componentIds[1] : componentIds[0],
                )
                .setLabel(t('banner.switch_button'))
                .setStyle(ButtonStyle.Success),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext(t('banner.download_hint'))),
            )
            .setButtonAccessory(button =>
              button
                .setLabel(t('banner.download_button'))
                .setStyle(ButtonStyle.Link)
                .setURL(bannerUrl),
            ),
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
                subtext(t('banner.download_hint', locale)),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel(t('banner.download_button', locale))
                .setURL(bannerUrl)
                .setStyle(ButtonStyle.Link),
            ),
        );
    }
  }
}
