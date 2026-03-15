import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {EmbedColors} from '../../../../util/EmbedColors';
import {createTranscript} from 'discord-transcript-v2';

export default class TestCommand extends Command {
  constructor() {
    super('test', 'test command');
  }

  async run(interaction: ChatInputCommandInteraction) {
    let channels = await interaction.guild?.channels.fetch(
      '1482667057802772521',
    );

    if (!channels) return;

    channels = channels as TextChannel;

    const exampleContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent('This is a test'),
      );

    const exampleEmbed = new EmbedBuilder()
      .setTitle('This is a test 2')
      .setDescription('This is a test 3');

    await channels.send({
      components: [exampleContainer],
      flags: [MessageFlags.IsComponentsV2],
    });
    await channels.send({
      embeds: [exampleEmbed],
    });

    const attachment = await createTranscript(channels);

    await channels.send({
      files: [attachment],
    });

    return;
  }
}
