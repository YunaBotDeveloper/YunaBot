import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import axios from 'axios';
import {Command} from '../../../Command';

interface UrbanDictDefinition {
  word: string;
  definition: string;
  example: string;
  author: string;
  thumbs_up: number;
  thumbs_down: number;
  permalink: string;
}

interface UrbanDictResponse {
  list: UrbanDictDefinition[];
}

export default class UrbanDictCommand extends Command {
  constructor() {
    super('urbandict', '📚 Tìm kiếm định nghĩa trên Urban Dictionary');

    this.advancedOptions.cooldown = 3000;

    this.data.addStringOption(option =>
      option
        .setName('term')
        .setDescription('Từ hoặc cụm từ cần tra cứu')
        .setRequired(true),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const term = interaction.options.getString('term', true);

    await interaction.deferReply();

    try {
      const response = await axios.get<UrbanDictResponse>(
        'https://api.urbandictionary.com/v0/define',
        {
          params: {term},
          timeout: 5000,
        },
      );

      if (!response.data.list || response.data.list.length === 0) {
        const noResultEmbed = new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle('❌ Không tìm thấy kết quả')
          .setDescription(
            `Không tìm thấy định nghĩa cho **${term}** trên Urban Dictionary.`,
          )
          .setTimestamp();

        await interaction.editReply({embeds: [noResultEmbed]});
        return;
      }

      // Get the first (most popular) definition
      const definition = response.data.list[0];

      // Clean up the definition and example text (remove brackets)
      const cleanDefinition = definition.definition
        .replace(/\[/g, '')
        .replace(/\]/g, '');
      const cleanExample = definition.example
        .replace(/\[/g, '')
        .replace(/\]/g, '');

      // Truncate if too long (Discord embed field limit is 1024 characters)
      const truncatedDefinition =
        cleanDefinition.length > 1024
          ? cleanDefinition.substring(0, 1021) + '...'
          : cleanDefinition;
      const truncatedExample =
        cleanExample.length > 1024
          ? cleanExample.substring(0, 1021) + '...'
          : cleanExample;

      const embed = new EmbedBuilder()
        .setColor(0x1d2439)
        .setTitle(`📚 ${definition.word}`)
        .setDescription(truncatedDefinition)
        .setFooter({
          text: `👍 ${definition.thumbs_up} | 👎 ${definition.thumbs_down} | Tác giả: ${definition.author}`,
        })
        .setTimestamp();

      // Add example if available
      if (cleanExample && cleanExample.trim().length > 0) {
        embed.addFields({
          name: '💬 Ví dụ',
          value: truncatedExample,
        });
      }

      // Add button to view on Urban Dictionary
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('🔗 Xem trên Urban Dictionary')
          .setStyle(ButtonStyle.Link)
          .setURL(definition.permalink),
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Urban Dictionary API error:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('❌ Lỗi')
        .setDescription(
          'Đã xảy ra lỗi khi tìm kiếm trên Urban Dictionary. Vui lòng thử lại sau.',
        )
        .setTimestamp();

      await interaction.editReply({embeds: [errorEmbed]});
    }
  }
}
