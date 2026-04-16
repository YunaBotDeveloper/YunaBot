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
import KissCount from '../../../../database/models/KissCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

const KISS_QUOTES = [
  'A kiss says what words cannot.',
  'A kiss is the language of the heart.',
  'Every kiss is a promise without words.',
  'Love is when their kiss melts your heart.',
  'No distance is far when hearts are close.',
];

const SELF_KISS_QUOTES = [
  'Self-love is the first step of a lifelong romance.',
  'Sometimes you just need to kiss yourself!',
  'The one always by your side is you.',
  'Loving yourself is not selfish, it is necessary.',
  'An air kiss counts too!',
];

const KISS_BACK_QUOTES = [
  'Love goes both ways!',
  'Kiss and kiss back, hearts racing.',
  'When two hearts beat in sync...',
  'No one wants to miss out!',
  'Return a kiss with a kiss!',
];

function randomQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default class KissCommand extends Command {
  constructor() {
    super('kiss', 'Kiss a user');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user you want to kiss')
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
      const errorContainer = StatusContainer.failed(
        failedEmoji,
        'You cannot kiss the bot.',
      );

      await interaction.editReply({
        components: [errorContainer],
      });

      return;
    }

    let gifUrl: string;
    try {
      const response = await fetch(
        'https://api.purrbot.site/v2/img/sfw/kiss/gif',
      );
      const data = (await response.json()) as {link: string; error: boolean};
      if (data.error || !data.link) throw new Error('API error');
      gifUrl = data.link;
    } catch {
      const failEmoji = await client.api.emojiAPI.getEmojiByName('failed');
      await interaction.editReply({
        components: [
          StatusContainer.failed(failEmoji, 'yeah it throw an error'),
        ],
      });
      return;
    }

    const userIds = {
      user1: interaction.user.id,
      user2: targetUser.id,
    };

    let kissCount = 0;
    if (targetUser.id !== interaction.user.id) {
      const [kissRecord] = await KissCount.findOrCreate({
        where: {userId: targetUser.id, guildId: interaction.guild!.id},
        defaults: {
          userId: targetUser.id,
          guildId: interaction.guild!.id,
          kissCount: 0,
        },
      });
      await kissRecord.increment('kissCount');
      kissCount = kissRecord.kissCount + 1;
    }

    let kissBackCustomId: string | null =
      shouldHideName || targetUser.id === interaction.user.id
        ? null
        : `kissBack_${interaction.id}`;

    const kissContainer = this.kissContainer(
      userIds,
      gifUrl,
      kissBackCustomId,
      false,
      false,
      shouldHideName,
      kissCount,
    );

    const successContainer = StatusContainer.success(
      successEmoji,
      'Sent successfully!',
    );

    await interaction.editReply({
      components: [successContainer],
    });

    const sentMessage = await (interaction.channel as TextChannel).send({
      components: [kissContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (kissBackCustomId) {
      ComponentManager.getComponentManager().register([
        {
          customId: kissBackCustomId,
          timeout: 60000,
          onTimeout: async () => {
            const timedOutContainer = this.kissContainer(
              userIds,
              gifUrl,
              kissBackCustomId,
              false,
              true,
              shouldHideName,
              kissCount,
            );
            await sentMessage.edit({components: [timedOutContainer]});
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.update({components: [loadingContainer]});

            const [backRecord] = await KissCount.findOrCreate({
              where: {userId: userIds.user1, guildId: interaction.guild!.id},
              defaults: {
                userId: userIds.user1,
                guildId: interaction.guild!.id,
                kissCount: 0,
              },
            });
            await backRecord.increment('kissCount');
            kissCount = backRecord.kissCount + 1;
            kissBackCustomId = null;

            const kissBackContainer = this.kissContainer(
              userIds,
              gifUrl,
              null,
              true,
              true,
              shouldHideName,
              kissCount,
            );
            await btnInteraction.editReply({components: [kissBackContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [targetUser.id],
        },
      ]);
    }

    return;
  }

  kissContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    kissBackCustomId: string | null,
    isKissBack: boolean,
    disabledKissBackButton: boolean,
    shouldHideName: boolean,
    kissCount: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(
      EmbedColors.random(),
    );

    const isSelfKiss = userIds.user1 === userIds.user2;

    if (isKissBack) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user2)} kissed back ${userMention(userIds.user1)}!`,
        ),
      );
    } else if (shouldHideName) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## Someone kissed ${userMention(userIds.user2)}!`),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} kissed ${userMention(userIds.user2)}`,
        ),
      );
    }

    const quote = isKissBack
      ? randomQuote(KISS_BACK_QUOTES)
      : isSelfKiss
        ? randomQuote(SELF_KISS_QUOTES)
        : randomQuote(KISS_QUOTES);

    container.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(subtext(`"${quote}"`)),
    );

    const kissedUserId = isKissBack ? userIds.user1 : userIds.user2;

    container
      .addSeparatorComponents(separator => separator)
      .addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(gifURL)),
      );

    if (kissCount > 0) {
      container
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            subtext(
              `${userMention(kissedUserId)} has been kissed ${kissCount} times!`,
            ),
          ),
        );
    }

    if (kissBackCustomId) {
      container.addSeparatorComponents(separator => separator);

      if (disabledKissBackButton) {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Timeout expired')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(kissBackCustomId!)
                .setLabel('Kiss back')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to kiss back')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(kissBackCustomId!)
                .setLabel('Kiss back')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
