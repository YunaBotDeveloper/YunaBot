import Event from '../Event';
import ExtendedClient from '../../classes/ExtendedClient';
import {
  ContainerBuilder,
  Events,
  GuildMember,
  TextChannel,
  time,
} from 'discord.js';
import {EmbedColors} from '../../util/EmbedColors';

export default class NewWelcomeEvent extends Event {
  constructor() {
    super(Events.GuildMemberAdd);
  }

  async run(client: ExtendedClient, member: GuildMember): Promise<void> {
    const WelcomeContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.pink())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## <:steppe:1446871671817502871> Xin chào thành viên mới | <@${member.user.id}> <:steppe:1446871671817502871>`,
        ),
      )
      .addSeparatorComponents(separator => separator)
      .addTextDisplayComponents(
        textDisplay =>
          textDisplay.setContent(
            `Chào mừng bạn đã đến với \`\`${member.guild.name}\`\``,
          ),
        textDisplay =>
          textDisplay.setContent(
            '- Bạn có thể trò chuyện tại <#1436622766504808499>',
          ),
        textDisplay =>
          textDisplay.setContent(
            '- Bạn có thể yêu cầu hỗ trợ tại <#1441004324837658665>',
          ),
        textDisplay =>
          textDisplay.setContent(
            '- Bạn có thể ủng hộ để server phát triển hơn tại <#1442856281311285318>',
          ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `-# Chúc bạn có một trải nghiệm vui vẻ • Member #${member.guild.memberCount} • ${time()}`,
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addMediaGalleryComponents(mediagallery =>
        mediagallery.addItems(item =>
          item.setURL(
            'https://r2.e-z.host/c4d74004-38e2-4dc2-996a-a9572d8a42cb/gst4521s.gif',
          ),
        ),
      );

    const WelcomeChannel = member.guild.channels.cache.get(
      '1420042908563669144',
    ) as TextChannel;

    if (!WelcomeChannel) return;

    await WelcomeChannel.send({
      components: [WelcomeContainer],
      flags: 'IsComponentsV2',
      allowedMentions: {
        users: [member.user.id],
      },
    });
  }
}
