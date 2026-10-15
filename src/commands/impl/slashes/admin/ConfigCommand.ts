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
import Log4TS from '../../../../logger/Log4TS';

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

    this.data.addSubcommand(subcommand =>
      subcommand.setName('appearance').setDescription('Set appearance'),
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
      case 'appearance':
        await this.setAppearance(interaction);
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
      await Access.getClient().api.emojiAPI.getEmojiByName('ui_success');
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

          await modalInteraction.guild.members.editMe({bio: botBio ?? ''});
          await GuildSettings.upsert({guildId, botBio});

          const emoji =
            await Access.getClient().api.emojiAPI.getEmojiByName('ui_success');
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

  private async setAppearance(
    interaction: ChatInputCommandInteraction<'cached'>,
  ): Promise<void> {
    const customId = `botAppearance_${interaction.id}`;

    const appearanceModal = new ModalBuilder()
      .setCustomId(customId)
      .setTitle('Bot Appearance')
      .addLabelComponents(label =>
        label
          .setLabel('Avatar')
          .setFileUploadComponent(fileUpload =>
            fileUpload
              .setCustomId('botAvatar')
              .setRequired(false)
              .setMaxValues(1),
          ),
      )
      .addLabelComponents(label =>
        label
          .setLabel('Click here if you want remove bot avatar.')
          .setCheckboxComponent(checkbox =>
            checkbox.setCustomId('botRemoveAvatar'),
          ),
      )
      .addLabelComponents(label =>
        label
          .setLabel('Banner')
          .setFileUploadComponent(fileUpload =>
            fileUpload
              .setCustomId('botBanner')
              .setRequired(false)
              .setMaxValues(1),
          ),
      )
      .addLabelComponents(label =>
        label
          .setLabel('Click here if you want remove bot banner.')
          .setCheckboxComponent(checkbox =>
            checkbox.setCustomId('botRemoveBanner'),
          ),
      );

    const components = ComponentManager.getComponentManager();
    components.register([
      {
        customId,
        handler: async (modalInteraction: ModalSubmitInteraction) => {
          components.unregister(customId);
          if (!modalInteraction.inCachedGuild()) return;
          await modalInteraction.deferReply();

          const avatar = modalInteraction.fields
            .getUploadedFiles('botAvatar')
            ?.first();
          const banner = modalInteraction.fields
            .getUploadedFiles('botBanner')
            ?.first();

          const edit = {
            avatar: modalInteraction.fields.getCheckbox('botRemoveAvatar')
              ? null
              : avatar?.url,
            banner: modalInteraction.fields.getCheckbox('botRemoveBanner')
              ? null
              : banner?.url,
          };

          const fail = async (message: string) => {
            const emoji =
              await Access.getClient().api.emojiAPI.getEmojiByName('ui_error');
            await modalInteraction.editReply({
              components: [StatusContainer.failed(emoji, message)],
              flags: [MessageFlags.IsComponentsV2],
            });
          };

          if (edit.avatar === undefined && edit.banner === undefined) {
            await fail('Nothing to change');
            return;
          }

          // ponytail: trusts the uploader's content type, so a renamed file
          // passes; sniff the file's magic bytes if that ever matters.
          const isImage = /^image\/(png|jpeg|gif|webp)\b/;
          if (
            [avatar, banner].some(
              file => file && !isImage.test(file.contentType ?? ''),
            )
          ) {
            await fail('Avatar and banner must be PNG, JPEG, GIF or WebP');
            return;
          }

          try {
            await modalInteraction.guild.members.editMe(edit);
          } catch (error) {
            Log4TS.getLogger().error(`Failed to edit bot appearance: ${error}`);
            await fail('Discord rejected that image');
            return;
          }

          const emoji =
            await Access.getClient().api.emojiAPI.getEmojiByName('ui_success');
          await modalInteraction.editReply({
            components: [
              StatusContainer.success(emoji, 'Bot appearance updated!'),
            ],
            flags: [MessageFlags.IsComponentsV2],
          });
        },
        type: ComponentEnum.MODAL,
        userCheck: [interaction.user.id],
        timeout: 15 * 60 * 1000,
      },
    ]);

    await interaction.showModal(appearanceModal);
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
