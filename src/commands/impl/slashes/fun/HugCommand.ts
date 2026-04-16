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
import HugCount from '../../../../database/models/HugCount.model';
import {EmbedColors} from '../../../../util/EmbedColors';
import ComponentManager from '../../../../component/manager/ComponentManager';
import {ComponentEnum} from '../../../../enum/ComponentEnum';

const HUG_QUOTES = [
  'A hug can heal what words cannot.',
  'Come on, give them a hug. Life is short!',
  'Warm arms are the best medicine.',
  'Sometimes all you need is a tight hug.',
  "A hug is the heart's language without translation.",
];

const SELF_HUG_QUOTES = [
  'Hugging yourself is also self-love!',
  'Sometimes you need to hug yourself.',
  'You deserve a hug, even from yourself!',
  'No one can hug you better than you can.',
  'Love yourself every day.',
];

const HUG_BACK_QUOTES = [
  'Hugging back makes the bond even stronger!',
  'When love is shared, it doubles.',
  'Spread warmth everywhere!',
  'No one loses in a battle of affection!',
  'Happiness is giving and receiving hugs.',
];

function randomQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default class HugCommand extends Command {
  constructor() {
    super('hug', 'Hug a user');

    this.advancedOptions.cooldown = 5000;

    this.data.addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user you want to hug')
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
          StatusContainer.failed(failedEmoji, 'You cannot hug the bot.'),
        ],
      });
      return;
    }

    let gifUrl: string;
    try {
      const response = await fetch(
        'https://api.purrbot.site/v2/img/sfw/hug/gif',
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

    let hugCount = 0;
    if (targetUser.id !== interaction.user.id) {
      const [hugRecord] = await HugCount.findOrCreate({
        where: {userId: targetUser.id, guildId: interaction.guild!.id},
        defaults: {
          userId: targetUser.id,
          guildId: interaction.guild!.id,
          hugCount: 0,
        },
      });
      await hugRecord.increment('hugCount');
      hugCount = hugRecord.hugCount + 1;
    }

    let hugBackCustomId: string | null =
      shouldHideName || targetUser.id === interaction.user.id
        ? null
        : `hugBack_${interaction.id}`;

    const hugContainer = this.hugContainer(
      userIds,
      gifUrl,
      hugBackCustomId,
      false,
      false,
      shouldHideName,
      hugCount,
    );

    const successContainer = StatusContainer.success(
      successEmoji,
      'Sent successfully!',
    );

    await interaction.editReply({
      components: [successContainer],
    });

    const sentMessage = await (interaction.channel as TextChannel).send({
      components: [hugContainer],
      flags: [MessageFlags.IsComponentsV2],
    });

    if (hugBackCustomId) {
      ComponentManager.getComponentManager().register([
        {
          customId: hugBackCustomId,
          timeout: 60000,
          onTimeout: async () => {
            const timedOutContainer = this.hugContainer(
              userIds,
              gifUrl,
              hugBackCustomId,
              false,
              true,
              shouldHideName,
              hugCount,
            );
            await sentMessage.edit({components: [timedOutContainer]});
          },
          handler: async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.update({components: [loadingContainer]});

            const [backRecord] = await HugCount.findOrCreate({
              where: {userId: userIds.user1, guildId: interaction.guild!.id},
              defaults: {
                userId: userIds.user1,
                guildId: interaction.guild!.id,
                hugCount: 0,
              },
            });
            await backRecord.increment('hugCount');
            hugCount = backRecord.hugCount + 1;
            hugBackCustomId = null;

            const hugBackContainer = this.hugContainer(
              userIds,
              gifUrl,
              null,
              true,
              true,
              shouldHideName,
              hugCount,
            );
            await btnInteraction.editReply({components: [hugBackContainer]});
          },
          type: ComponentEnum.BUTTON,
          userCheck: [targetUser.id],
        },
      ]);
    }

    return;
  }

  hugContainer(
    userIds: {user1: string; user2: string},
    gifURL: string,
    hugBackCustomId: string | null,
    isHugBack: boolean,
    disabledHugBackButton: boolean,
    shouldHideName: boolean,
    hugCount: number,
  ): ContainerBuilder {
    const container = new ContainerBuilder().setAccentColor(
      EmbedColors.random(),
    );

    const isSelfHug = userIds.user1 === userIds.user2;

    if (isHugBack) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user2)} hugged back ${userMention(userIds.user1)}!`,
        ),
      );
    } else if (shouldHideName) {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## Someone hugged ${userMention(userIds.user2)}!`,
        ),
      );
    } else {
      container.addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `## ${userMention(userIds.user1)} hugged ${userMention(userIds.user2)}`,
        ),
      );
    }

    const quote = isHugBack
      ? randomQuote(HUG_BACK_QUOTES)
      : isSelfHug
        ? randomQuote(SELF_HUG_QUOTES)
        : randomQuote(HUG_QUOTES);

    container.addTextDisplayComponents(textDisplay =>
      textDisplay.setContent(subtext(`"${quote}"`)),
    );

    const huggedUserId = isHugBack ? userIds.user1 : userIds.user2;

    container
      .addSeparatorComponents(separator => separator)
      .addMediaGalleryComponents(gallery =>
        gallery.addItems(item => item.setURL(gifURL)),
      );

    if (hugCount > 0) {
      container
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(textDisplay =>
          textDisplay.setContent(
            subtext(
              `${userMention(huggedUserId)} has been hugged ${hugCount} times!`,
            ),
          ),
        );
    }

    if (hugBackCustomId) {
      container.addSeparatorComponents(separator => separator);

      if (disabledHugBackButton) {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Timeout expired')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(hugBackCustomId!)
                .setLabel('Hug back')
                .setDisabled(true)
                .setStyle(ButtonStyle.Primary),
            ),
        );
      } else {
        container.addSectionComponents(section =>
          section
            .addTextDisplayComponents(textDisplay =>
              textDisplay.setContent(subtext('Click here to hug back')),
            )
            .setButtonAccessory(button =>
              button
                .setCustomId(hugBackCustomId!)
                .setLabel('Hug back')
                .setStyle(ButtonStyle.Primary),
            ),
        );
      }
    }

    return container;
  }
}
