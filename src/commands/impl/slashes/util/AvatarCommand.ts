import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import {Command} from '../../../Command';
import ButtonComponentBuilder from '../../../../component/builders/ButtonComponentBuilder';
import ComponentManager from '../../../../component/manager/ComponentManager';

export default class AvatarCommand extends Command {
  constructor() {
    super('avatar', '🖼️ Hiển thị avatar của người dùng');

    this.advancedOptions.cooldown = 3000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('Người dùng cần xem avatar (mặc định là bạn)'),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    // Get global avatar (animated if available)
    const globalAvatar = targetUser.displayAvatarURL({
      size: 4096,
      forceStatic: false,
    });

    // Get guild avatar if available (animated if available)
    const guildAvatar = member?.displayAvatarURL({
      size: 4096,
      forceStatic: false,
    });

    // Check if user has a guild-specific avatar
    const hasGuildAvatar =
      member && guildAvatar && guildAvatar !== globalAvatar;

    const buildEmbed = (type: 'global' | 'server') => {
      const isServer = type === 'server' && hasGuildAvatar;
      return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🖼️ Avatar của ${targetUser.tag}`)
        .setDescription(
          hasGuildAvatar
            ? `**Loại avatar:** ${isServer ? 'Server' : 'Global'} Avatar\n\n*Sử dụng nút bên dưới để chuyển đổi giữa avatar server và avatar global*`
            : '**Loại avatar:** Global Avatar',
        )
        .setImage(isServer ? guildAvatar! : globalAvatar)
        .setFooter({text: `ID: ${targetUser.id}`})
        .setTimestamp();
    };

    const buildRow = (active: 'global' | 'server') => {
      if (hasGuildAvatar) {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`avatar_global_${interaction.id}`)
            .setLabel('🌐 Global Avatar')
            .setStyle(
              active === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary,
            )
            .setDisabled(active === 'global'),
          new ButtonBuilder()
            .setCustomId(`avatar_server_${interaction.id}`)
            .setLabel('🏠 Server Avatar')
            .setStyle(
              active === 'server' ? ButtonStyle.Primary : ButtonStyle.Secondary,
            )
            .setDisabled(active === 'server'),
        );
      }
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Open Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(globalAvatar),
      );
    };

    const initialType = hasGuildAvatar ? 'server' : 'global';

    if (hasGuildAvatar) {
      const componentManager = ComponentManager.getComponentManager();
      const componentIds = [
        `avatar_global_${interaction.id}`,
        `avatar_server_${interaction.id}`,
      ];

      const globalButton = new ButtonComponentBuilder()
        .setCustomId(componentIds[0])
        .setUserCheck([interaction.user.id])
        .setTimeout(60000)
        .setHandler(async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({
            embeds: [buildEmbed('global')],
            components: [buildRow('global')],
          });
        })
        .setOnTimeout(() => componentManager.unregisterMany(componentIds));

      const serverButton = new ButtonComponentBuilder()
        .setCustomId(componentIds[1])
        .setUserCheck([interaction.user.id])
        .setTimeout(60000)
        .setHandler(async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.update({
            embeds: [buildEmbed('server')],
            components: [buildRow('server')],
          });
        })
        .setOnTimeout(async () => {
          componentManager.unregisterMany(componentIds);
          try {
            const reply = await interaction.fetchReply();
            const disabledRow =
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`avatar_global_${interaction.id}`)
                  .setLabel('🌐 Global Avatar')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
                new ButtonBuilder()
                  .setCustomId(`avatar_server_${interaction.id}`)
                  .setLabel('🏠 Server Avatar')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
              );
            await reply.edit({components: [disabledRow]});
          } catch {}
        });

      componentManager.register([globalButton, serverButton]);
    }

    await interaction.reply({
      embeds: [buildEmbed(initialType)],
      components: [buildRow(initialType)],
    });
  }
}
