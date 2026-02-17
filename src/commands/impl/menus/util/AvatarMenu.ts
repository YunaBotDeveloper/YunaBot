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

export default class AvatarMenu extends ContextMenuCommand {
  constructor() {
    super(t('avatar.menu.name'), ApplicationCommandType.User);

    this.data.setNameLocalizations(tMap('avatar.menu.name'));

    this.advancedOptions.cooldown = 10000;
  }

  async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
    const locale = interaction.locale;

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');
    const memberEmoji = await client.api.emojiAPI.getEmojiByName('member');
    const loadingContainer = StatusContainer.loading(locale, loadingEmoji);
    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    const targetUser = interaction.targetUser;
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
        locale,
      );

      await interaction.editReply({
        components: [avatarContainer],
      });

      ComponentManager.getComponentManager().register([
        {
          customId: componentIds[0],
          handler: async (interaction: ButtonInteraction) => {
            const avatarContainer = this.avatarContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'global',
              globalAvatar,
              guildAvatar,
              componentIds,
              locale,
            );

            await interaction.update({components: [avatarContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: componentIds[1],
          handler: async (interaction: ButtonInteraction) => {
            const avatarContainer = this.avatarContainer(
              infoEmoji,
              memberEmoji,
              targetUser.id,
              true,
              'guild',
              globalAvatar,
              guildAvatar,
              componentIds,
              locale,
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
        locale,
      );

      await interaction.editReply({
        components: [avatarContainer],
        allowedMentions: {},
      });
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
    locale: string,
  ): ContainerBuilder {
    const isGuild = active === 'guild' && hasGuildAvatar;
    const avatarUrl = isGuild ? guildAvatar! : globalAvatar;

    const titleText = `## ${memberEmoji} ${(t('avatar.title'), locale, {user: userMention(userId)})}`;
    const typeText = `**${t('avatar.type_label', locale)}** ${inlineCode(isGuild ? t('avatar.type.guild', locale) : t('avatar.type.global', locale))}`;

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
                    ? t('avatar.switch_to_guild', locale)
                    : t('avatar.switch_to_global', locale),
                ),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(
                  active === 'global' ? componentIds[1] : componentIds[0],
                )
                .setLabel(t('avatar.switch_button', locale))
                .setStyle(ButtonStyle.Success),
            ),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext(t('avatar.download_hint', locale)),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel(t('avatar.download_button', locale))
                .setStyle(ButtonStyle.Link)
                .setURL(avatarUrl),
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
          gallery.addItems(item => item.setURL(avatarUrl)),
        )
        .addSeparatorComponents(separator => separator)
        .addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(
                subtext(t('avatar.download_hint', locale)),
              ),
            )
            .setButtonAccessory(button =>
              button
                .setLabel(t('avatar.download_button', locale))
                .setURL(avatarUrl)
                .setStyle(ButtonStyle.Link),
            ),
        );
    }
  }
}
