import {AttachmentBuilder, ChatInputCommandInteraction} from 'discord.js';
import {Command} from '../../../Command';
import {createCaptcha} from 'captcha-canvas';

export default class TestCommand extends Command {
  constructor() {
    super('test', 'test feature');
  }

  async run(interaction: ChatInputCommandInteraction) {
    const {image, text} = createCaptcha(400, 150);

    const buffer = await image;
    const attachment = new AttachmentBuilder(buffer, {name: 'captcha.png'});

    await interaction.reply({files: [attachment]});
  }
}
