import {
  ApplicationCommandType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ContainerBuilder,
  GuildMember,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import {ContextMenuCommand} from '../../ContextMenuCommand';
import {EmbedColors} from '../../../util/EmbedColors';
import {StatusContainer} from '../../../util/StatusContainer';
import ExtendedClient from '../../../classes/ExtendedClient';
import ComponentManager from '../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../enum/ComponentEnum';

export default class GetUserAvatarMenu extends ContextMenuCommand {
  constructor() {
    super('Get User Avatar', ApplicationCommandType.User);
  }

  async run(interaction: UserContextMenuCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const infoEmoji = await client.api.emojiAPI.getEmojiByName('info');

    const loadingContainer = await StatusContainer.loading(loadingEmoji);

    await interaction.reply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });

    const targetUser = interaction.targetUser;
    const targetMember = interaction.targetMember;

    const globalAvatarURL = targetUser.displayAvatarURL({
      size: 4096,
      extension: 'png',
    });

    let guildAvatarURL: string | null = null;
    if (targetMember && targetMember instanceof GuildMember) {
      const memberAvatar = targetMember.avatarURL({
        size: 4096,
        extension: 'png',
      });
      if (memberAvatar && memberAvatar !== globalAvatarURL) {
        guildAvatarURL = memberAvatar;
      }
    }

    const avatarContainer = this.buildAvatarContainer(
      infoEmoji,
      targetUser.displayName,
      globalAvatarURL,
      true,
      guildAvatarURL !== null,
    );

    await interaction.editReply({
      components: [avatarContainer],
    });

    if (guildAvatarURL) {
      ComponentManager.getComponentManager().register([
        {
          customId: 'avatarGlobal',
          handler: async (interaction: ButtonInteraction) => {
            const container = this.buildAvatarContainer(
              infoEmoji,
              targetUser.displayName,
              globalAvatarURL,
              true,
              true,
            );
            await interaction.update({
              components: [container],
            });
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
        {
          customId: 'avatarGuild',
          handler: async (interaction: ButtonInteraction) => {
            const container = this.buildAvatarContainer(
              infoEmoji,
              targetUser.displayName,
              guildAvatarURL,
              false,
              true,
            );
            await interaction.update({
              components: [container],
            });
          },
          type: ComponentEnum.BUTTON,
          userCheck: [interaction.user.id],
        },
      ]);
    }
  }

  private buildAvatarContainer(
    infoEmoji: unknown,
    displayName: string,
    avatarURL: string,
    isGlobal: boolean,
    hasGuildAvatar: boolean,
  ): ContainerBuilder {
    const avatarType = isGlobal ? '🌐 Global Avatar' : '🏠 Guild Avatar';

    const avatarContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${infoEmoji} Avatar của ${displayName}`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`### ${avatarType}`),
      )
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(avatarURL),
        ),
      )
      .addActionRowComponents(row => {
        row.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Mở Avatar')
            .setURL(avatarURL)
            .setEmoji('🔗'),
        );

        if (hasGuildAvatar) {
          row.addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Secondary)
              .setCustomId(isGlobal ? 'avatarGuild' : 'avatarGlobal')
              .setLabel(isGlobal ? 'Guild Avatar' : 'Global Avatar')
              .setEmoji(isGlobal ? '🏠' : '🌐'),
          );
        }

        return row;
      });

    return avatarContainer;
  }
}
