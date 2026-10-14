import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  TextInputStyle,
} from 'discord.js';
import {Command} from '../../../Command';
import Access from '../../../../instances/Access';
import BotNameHistory from '../../../../database/models/BotNameHistory.model';
import GuildSettings from '../../../../database/models/GuildSettings.model';
import {StatusContainer} from '../../../../util/StatusContainer';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

export default class ConfigCommand extends Command {
  constructor() {
    super('config', 'Bot configuration');

    this.data
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(subcommand =>
        subcommand
          .setName('name')
          .setDescription('Set bot name')
          .addStringOption(option =>
            option
              .setName('name')
              .setDescription('New bot name')
              .setRequired(true)
              .setMaxLength(32)
              .setAutocomplete(true),
          ),
      );

    this.data.addSubcommand(subcommand =>
      subcommand.setName('bio').setDescription('Set bot bio'),
    );
  }

  async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    switch (interaction.options.getSubcommand()) {
      case 'name':
        await this.setName(interaction);
        break;
      case 'bio':
        await this.setBio(interaction);
        break;
    }
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    switch (interaction.options.getSubcommand()) {
      case 'name':
        await this.suggestNames(interaction);
        break;
    }
  }

  private async setName(
    interaction: ChatInputCommandInteraction<'cached'>,
  ): Promise<void> {
    const name = interaction.options.getString('name', true);
    const guildId = interaction.guildId;

    await interaction.deferReply();
    await interaction.guild.members.editMe({nick: name});

    await GuildSettings.upsert({guildId, botName: name});
    await BotNameHistory.upsert({guildId, name, usedAt: new Date()});

    const emoji =
      await Access.getClient().api.emojiAPI.getEmojiByName('success');
    await interaction.editReply({
      components: [StatusContainer.success(emoji, `Bot name set to ${name}`)],
      flags: [MessageFlags.IsComponentsV2],
    });
  }

  private async setBio(
    interaction: ChatInputCommandInteraction<'cached'>,
  ): Promise<void> {
    const guildId = interaction.guildId;
    const customId = `botBio_${interaction.id}`;

    const modal = new ModalBuilder().setCustomId(customId).setTitle('Bot bio');
    const bioLabel = new LabelBuilder()
      .setLabel('Bot bio')
      .setDescription('Leave blank to clear')
      .setTextInputComponent(textInput =>
        textInput
          .setCustomId('bioInput')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Leave blank to clear')
          .setRequired(false)
          .setMaxLength(190),
      );
    modal.addLabelComponents(bioLabel);

    const components = ComponentManager.getComponentManager();
    components.register([
      {
        customId,
        handler: async (modalInteraction: ModalSubmitInteraction) => {
          components.unregister(customId);
          if (!modalInteraction.inCachedGuild()) return;
          await modalInteraction.deferReply();

          const botBio =
            modalInteraction.fields.getTextInputValue('bioInput') || null;
          // Discord ignores bio: null; only '' clears it.
          await modalInteraction.guild.members.editMe({bio: botBio ?? ''});
          await GuildSettings.upsert({guildId, botBio});

          const emoji =
            await Access.getClient().api.emojiAPI.getEmojiByName('success');
          await modalInteraction.editReply({
            components: [
              StatusContainer.success(
                emoji,
                botBio ? 'Bot bio updated!' : 'Bot bio cleared!',
              ),
            ],
            flags: [MessageFlags.IsComponentsV2],
          });
        },
        type: ComponentEnum.MODAL,
        userCheck: [interaction.user.id],
        timeout: 15 * 60 * 1000,
      },
    ]);

    await interaction.showModal(modal);
  }

  private async suggestNames(
    interaction: AutocompleteInteraction<'cached'>,
  ): Promise<void> {
    const typed = interaction.options.getFocused().toLowerCase();
    const history = await BotNameHistory.findAll({
      where: {guildId: interaction.guildId},
      order: [['usedAt', 'DESC']],
    });

    await interaction.respond(
      history
        .filter(entry => entry.name.toLowerCase().includes(typed))
        .slice(0, 25)
        .map(entry => ({name: entry.name, value: entry.name})),
    );
  }
}
