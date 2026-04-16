import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  subtext,
  TextChannel,
  userMention,
} from 'discord.js';
import {Command} from '../../../Command';
import ExtendedClient from '../../../../classes/ExtendedClient';
import {StatusContainer} from '../../../../util/StatusContainer';
import PatCount from '../../../../database/models/PatCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

const PAT_QUOTES = [
  'A pat on the head can mean more than a thousand words.',
  'Warm hands, peaceful heart.',
  'Being comforted is pure happiness.',
  'Sometimes all you need is a gentle head pat.',
  'A small gesture can mean a lot.',
];

const SELF_PAT_QUOTES = [
  'It is okay to praise yourself, you deserve it!',
  'Sometimes you need to comfort yourself.',
  'Great job! Treat yourself.',
  'No one understands you better than you do!',
  'Being proud of yourself is wonderful.',
];

const PAT_BACK_QUOTES = [
  'Spread warmth everywhere!',
  'Patting back makes bonds stronger.',
  'When love is shared, it doubles.',
  'No one loses in a battle of affection!',
  'Happiness is comforting and being comforted back.',
];

function randomQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default class PatCommand extends Command {
  constructor() {
    super('pat', 'Pat a user');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user you want to pat')
        .setRequired(true),
    );

    this.data.addBooleanOption(option =>
      option
        .setName('hide')
        .setDescription('Do you want to hide your name?')
        .setRequired(false),
    );
  }

  async run(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      flags: [MessageFlags.Ephemeral],
    });

    const client = interaction.client as ExtendedClient;
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const loadingContainer = StatusContainer.loading(loadingEmoji);

    await interaction.editReply({
      components: [loadingContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    const targetUser = interaction.options.getUser('user', true);

    const shouldHideName = interaction.options.getBoolean('hide') ?? false;

    if (targetUser.bot) {
      await interaction.editReply({
        components: [
          StatusContainer.failed(failedEmoji, 'You cannot pat the bot.'),
        ],
      });
      return;
    }

    let gifUrl: string;
    try {
      const response = await fetch(
        'https://api.purrbot.site/v2/img/sfw/pat/gif',
      );
      const data = (await response.json()) as {link: string; error: boolean};
      if (data.error || !data.link) throw new Error('API error');
      gifUrl = data.link;
    } catch {
      await interaction.editReply({
        components: [
          StatusContainer.failed(failedEmoji, 'yeah it throw an error'),
        ],
      });
      return;
    }

    const userIds = {
      user1: interaction.user.id,
      user2: targetUser.id,
    };

    let patCount = 0;
    if (targetUser.id !== interaction.user.id) {
      const [patRecord] = await PatCount.findOrCreate({
        where: {userId: targetUser.id, guildId: interaction.guild!.id},
        defaults: {
          userId: targetUser.id,
          guildId: interaction.guild!.id,
          patCount: 0,
        },
      });
      await patRecord.increment('patCount');
      patCount = patRecord.patCount + 1;
    }

    let patBackCustomId: string | null =
      shouldHideName || targetUser.id === interaction.user.id
        ? null
        : `patBack_${interaction.id}`;

    const patContainer = this.patContainer(
      userIds,
      gifUrl,
      patBackCustomId,
      false,
      false,
      shouldHideName,
      patCount,
    );

    const successContainer = StatusContainer.success(
      successEmoji,
      'Sent successfully!',
    );

    await interaction.editReply({
      components: [successContainer],
    });

    const sentMessage = await (interaction.channel as TextChannel).send({
      components: [patContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (patBackCustomId) {
      ComponentManager.getComponentManager().register([
        {
          customId: patBackCustomId,
          timeout: 60000,
          onTimeout: async () => {
            const timedOutContainer = this.patContainer(
              userIds,
              gifUrl,
              patBackCustomId,
              false,
              true,
              shouldHideName,
              patCount,
            );
            await sentMessage.edit({components: [timedOutContainer]});
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.update({components: [loadingContainer]});

            const [backRecord] = await PatCount.findOrCreate({
              where: {userId: userIds.user1, guildId: interaction.guild!.id},
              defaults: {
                userId: userIds.user1,
                guildId: interaction.guild!.id,
                patCount: 0,
              },
            });
            await backRecord.increment('patCount');
            patCount = backRecord.patCount + 1;
            patBackCustomId = null;

            const patBackContainer = this.patContainer(
              userIds,
              gifUrl,
              null,
              true,
              true,
              shouldHideName,
              patCount,
            );
            await btnInteraction.editReply({components: [patBackContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [targetUser.id],
        },
      ]);
    }

    return;
  }

  patContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    patBackCustomId: string | null,
    isPatBack: boolean,
    disabledPatBackButton: boolean,
    shouldHideName: boolean,
    patCount: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(
      EmbedColors.random(),
    );

    const isSelfPat = userIds.user1 === userIds.user2;

    if (isPatBack) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user2)} patted back ${userMention(userIds.user1)}!`,
        ),
      );
    } else if (shouldHideName) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## Someone patted ${userMention(userIds.user2)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} patted ${userMention(userIds.user2)}`,
        ),
      );
    }

    const quote = isPatBack
      ? randomQuote(PAT_BACK_QUOTES)
      : isSelfPat
        ? randomQuote(SELF_PAT_QUOTES)
        : randomQuote(PAT_QUOTES);

    container.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(subtext(`"${quote}"`)),
    );

    const pattedUserId = isPatBack ? userIds.user1 : userIds.user2;

    container
      .addSeparatorComponents(separator => separator)
      .addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(gifURL)),
      );

    if (patCount > 0) {
      container
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            subtext(
              `${userMention(pattedUserId)} has been patted ${patCount} times!`,
            ),
          ),
        );
    }

    if (patBackCustomId) {
      container.addSeparatorComponents(separator => separator);

      if (disabledPatBackButton) {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Timeout expired')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(patBackCustomId!)
                .setLabel('Pat back')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to pat back')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(patBackCustomId!)
                .setLabel('Pat back')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
