import {nanoid} from 'nanoid';
import ExtendedClient from '../../../../classes/ExtendedClient';
import ComponentManager from '../../../../component/manager/ComponentManager';
import Config from '../../../../config/Config';
import Balance from '../../../../database/models/Balance.model';
import LoanLog from '../../../../database/models/LoanLog.model';
import {ComponentEnum} from '../../../../enum/ComponentEnum';
import {EmbedColors} from '../../../../util/EmbedColors';
import {numberFormat} from '../../../../util/NumberFormat';
import {Command} from '../../../Command';
import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  subtext,
  italic,
  TextInputStyle,
  userMention,
} from 'discord.js';

export default class BankCommand extends Command {
  private readonly maxLoan = Config.getInstance().bank.loan.maxLoan;
  private readonly minLoan = Config.getInstance().bank.loan.minLoan;
  private readonly baseInterest = Config.getInstance().bank.loan.baseInterest;

  constructor() {
    super('bank', 'Ngân hàng của bạn');

    this.advancedOptions.cooldown = 60000;
  }

  async run(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;
    const bankEmoji = await client.api.emojiAPI.getEmojiByName('bank');
    const failedEmoji = await client.api.emojiAPI.getEmojiByName('failed');
    const successEmoji = await client.api.emojiAPI.getEmojiByName('success');
    const loadingEmoji = await client.api.emojiAPI.getEmojiByName('loading');

    const bankContainer = new ContainerBuilder()
      .setAccentColor(EmbedColors.random())
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(`## ${bankEmoji} Ngân Hàng ${bankEmoji}`),
      )
      .addSeparatorComponents(seperator => seperator)
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          `Chào mừng ${userMention(interaction.user.id)} đã đến với ngân hàng của chúng tôi!`,
        ),
      )
      .addTextDisplayComponents(textDisplay =>
        textDisplay.setContent(
          'Để bắt đầu, vui lòng chọn yêu cầu của bạn ở phía dưới.',
        ),
      )
      .addSeparatorComponents(seperator => seperator)
      .addActionRowComponents<StringSelectMenuBuilder>(row =>
        row.addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('bankSelect')
            .setPlaceholder('Chọn yêu cầu của bạn')
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel('Khu vực vay tiền')
                .setDescription('Vay tiền dễ dàng')
                .setValue('loan'),
            ),
        ),
      );

    ComponentManager.getComponentManager().register([
      {
        customId: 'bankSelect',
        type: ComponentEnum.MENU,
        userCheck: [interaction.user.id],
        handler: async (interaction: StringSelectMenuInteraction) => {
          switch (interaction.values[0]) {
            case 'loan': {
              const loanMenu = await this.loanStringSelectHandler(interaction);

              const loanContainer = new ContainerBuilder()
                .setAccentColor(EmbedColors.random())
                .addTextDisplayComponents(textDisplay =>
                  textDisplay.setContent(
                    `## ${bankEmoji} Ngân Hàng | Vay Tiền ${bankEmoji}`,
                  ),
                )
                .addSeparatorComponents(seperator => seperator)
                .addTextDisplayComponents(textDisplay =>
                  textDisplay.setContent(
                    `Chào mừng ${userMention(interaction.user.id)} đến với khu vực vay tiền!`,
                  ),
                )
                .addTextDisplayComponents(textDisplay =>
                  textDisplay.setContent(
                    'Vui lòng chọn yêu cầu của bạn ở phía dưới.',
                  ),
                )
                .addActionRowComponents<StringSelectMenuBuilder>(row =>
                  row.addComponents(loanMenu),
                );

              ComponentManager.getComponentManager().register([
                {
                  customId: 'loanStart',
                  handler: async (interaction: StringSelectMenuInteraction) => {
                    const activeLoan = await LoanLog.findOne({
                      where: {userId: interaction.user.id, isPaid: false},
                    });

                    switch (interaction.values[0]) {
                      case 'loanCreate': {
                        const [userBalance] = await Balance.findOrCreate({
                          where: {userId: interaction.user.id},
                          defaults: {
                            userId: interaction.user.id,
                            balance: 1000,
                            creditScore: 500,
                          },
                        });

                        const creditScore = userBalance.creditScore || 500;
                        const personalMaxLoan = this.getMaxLoan(creditScore);

                        const loanCreateModal = new ModalBuilder()
                          .setCustomId('loanCreateModal')
                          .setTitle('Vay tiền')
                          .addLabelComponents(
                            new LabelBuilder()
                              .setLabel('Bạn muốn vay bao nhiều tiền?')
                              .setDescription(
                                `Bạn có thể vay tối đa ${numberFormat(personalMaxLoan)}.`,
                              )
                              .setTextInputComponent(textInput =>
                                textInput
                                  .setCustomId('howMuch')
                                  .setStyle(TextInputStyle.Short)
                                  .setMinLength(1)
                                  .setMaxLength(5)
                                  .setPlaceholder('Nhập số tiền bạn muốn vay'),
                              ),
                            new LabelBuilder()
                              .setLabel('Bạn muốn vay trong bao lâu?')
                              .setDescription('Nhập số giờ (1-12 giờ)')
                              .setTextInputComponent(textInput =>
                                textInput
                                  .setCustomId('loanDuration')
                                  .setStyle(TextInputStyle.Short)
                                  .setPlaceholder('Ví dụ: 6 (cho 6 giờ)')
                                  .setMinLength(1)
                                  .setMaxLength(2),
                              ),
                          );
                        await interaction.showModal(loanCreateModal);

                        // Unregister loanStart immediately to prevent timeout
                        ComponentManager.getComponentManager().unregister(
                          'loanStart',
                        );

                        ComponentManager.getComponentManager().register([
                          {
                            customId: 'loanCreateModal',
                            handler: async (
                              interaction: ModalSubmitInteraction,
                            ) => {
                              await interaction.deferUpdate();

                              if (!interaction.message) {
                                return;
                              }

                              const howMuch =
                                interaction.fields.getTextInputValue('howMuch');
                              const loanDuration =
                                interaction.fields.getTextInputValue(
                                  'loanDuration',
                                );

                              if (
                                !parseInt(howMuch) ||
                                !parseInt(loanDuration)
                              ) {
                                const invalidContainer = new ContainerBuilder()
                                  .setAccentColor(EmbedColors.red())
                                  .addTextDisplayComponents(textDisplay =>
                                    textDisplay.setContent(
                                      `## ${failedEmoji} Số tiền vay / thời hạn vay không hợp lệ!`,
                                    ),
                                  )
                                  .addTextDisplayComponents(textDisplay =>
                                    textDisplay.setContent(
                                      'Vui lòng nhập số hợp lệ.',
                                    ),
                                  );

                                await interaction.message.edit({
                                  components: [invalidContainer],
                                  flags: MessageFlags.IsComponentsV2,
                                });

                                return;
                              }

                              const amount = parseInt(howMuch);
                              const durationHours = parseInt(loanDuration);

                              if (durationHours < 1 || durationHours > 12) {
                                const invalidDurationContainer =
                                  new ContainerBuilder()
                                    .setAccentColor(EmbedColors.red())
                                    .addTextDisplayComponents(textDisplay =>
                                      textDisplay.setContent(
                                        `## ${failedEmoji} Thời hạn vay không hợp lệ!`,
                                      ),
                                    )
                                    .addTextDisplayComponents(textDisplay =>
                                      textDisplay.setContent(
                                        'Bạn chỉ có thể vay từ 1 đến 12 giờ.',
                                      ),
                                    );

                                await interaction.message.edit({
                                  components: [invalidDurationContainer],
                                  flags: MessageFlags.IsComponentsV2,
                                });

                                return;
                              }

                              const processingContainer = new ContainerBuilder()
                                .setAccentColor(EmbedColors.yellow())
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `## ${loadingEmoji} Đang xử lý, vui lòng đợi...`,
                                  ),
                                );

                              await interaction.message.edit({
                                components: [processingContainer],
                                flags: MessageFlags.IsComponentsV2,
                              });

                              const [userBalance] = await Balance.findOrCreate({
                                where: {userId: interaction.user.id},
                                defaults: {
                                  userId: interaction.user.id,
                                  balance: 1000,
                                  creditScore: 500,
                                },
                              });

                              const creditScore =
                                userBalance.creditScore || 500;
                              const personalMaxLoan =
                                this.getMaxLoan(creditScore);

                              if (
                                amount < this.minLoan ||
                                amount > personalMaxLoan
                              ) {
                                const invalidAmountContainer =
                                  new ContainerBuilder()
                                    .setAccentColor(EmbedColors.red())
                                    .addTextDisplayComponents(textDisplay =>
                                      textDisplay.setContent(
                                        `## ${failedEmoji} Số tiền vay không hợp lệ!`,
                                      ),
                                    )
                                    .addTextDisplayComponents(textDisplay =>
                                      textDisplay.setContent(
                                        `Bạn chỉ có thể vay từ **${numberFormat(this.minLoan)}** đến **${numberFormat(personalMaxLoan)}**`,
                                      ),
                                    );

                                await interaction.message.edit({
                                  components: [invalidAmountContainer],
                                  flags: MessageFlags.IsComponentsV2,
                                });

                                return;
                              }

                              const interestRate =
                                this.getInterestRate(creditScore);
                              const now = Date.now();
                              const dueDate =
                                now + durationHours * 60 * 60 * 1000;
                              const totalOwed = Math.floor(
                                amount * (1 + interestRate),
                              );
                              const loanId = nanoid(8);

                              await LoanLog.create({
                                loanId,
                                userId: interaction.user.id,
                                amount,
                                interestRate,
                                totalOwed,
                                takenAt: now,
                                dueDate,
                                repaidAt: null,
                                isPaid: false,
                              });

                              await userBalance.update({
                                balance: userBalance.balance + amount,
                              });

                              await userBalance.reload();
                              const newBalance = userBalance.balance;

                              const successContainer = new ContainerBuilder()
                                .setAccentColor(EmbedColors.green())
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `## ${successEmoji} Vay tiền thành công!`,
                                  ),
                                )
                                .addSeparatorComponents(separator => separator)
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `Chúc mừng ${userMention(interaction.user.id)}! Bạn đã vay tiền thành công.`,
                                  ),
                                )
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `🆔 **Mã khoản vay:** #${loanId}`,
                                  ),
                                )
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `💰 **Số tiền vay:** ${numberFormat(amount)}`,
                                  ),
                                )
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `📊 **Lãi suất:** ${(interestRate * 100).toFixed(1)}%`,
                                  ),
                                )
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `💸 **Tổng phải trả:** ${numberFormat(totalOwed)}`,
                                  ),
                                )
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `⏰ **Thời hạn:** ${durationHours} giờ (<t:${Math.floor(dueDate / 1000)}:R>)`,
                                  ),
                                )
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    `💵 **Số dư mới:** ${numberFormat(newBalance)}`,
                                  ),
                                )
                                .addSeparatorComponents(separator => separator)
                                .addTextDisplayComponents(textDisplay =>
                                  textDisplay.setContent(
                                    subtext(
                                      italic(
                                        'Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!',
                                      ),
                                    ),
                                  ),
                                );

                              await interaction.message.edit({
                                components: [successContainer],
                                flags: MessageFlags.IsComponentsV2,
                              });
                            },
                            type: ComponentEnum.MODAL,
                            userCheck: [interaction.user.id],
                          },
                        ]);
                        break;
                      }
                      case 'loanRepay': {
                        ComponentManager.getComponentManager().unregister(
                          'loanStart',
                        );
                        await interaction.reply({
                          content:
                            'Chức năng trả khoản vay đang được phát triển.',
                          flags: MessageFlags.Ephemeral,
                        });
                        break;
                      }
                      case 'loanInfo': {
                        ComponentManager.getComponentManager().unregister(
                          'loanStart',
                        );
                        if (activeLoan) {
                          // TODO: Implement loan info display logic
                          await interaction.reply({
                            content: `Thông tin khoản vay của bạn:\n🆔 Mã khoản vay: #${activeLoan.loanId}\n💰 Số tiền: ${numberFormat(activeLoan.amount)}\n💸 Tổng phải trả: ${numberFormat(activeLoan.totalOwed)}\n📊 Đã trả: ${activeLoan.isPaid ? 'Có' : 'Chưa'}`,
                            flags: MessageFlags.Ephemeral,
                          });
                        } else {
                          await interaction.reply({
                            content: 'Bạn không có khoản vay nào.',
                            flags: MessageFlags.Ephemeral,
                          });
                        }
                        break;
                      }
                    }

                    return;
                  },
                  type: ComponentEnum.MENU,
                  userCheck: [interaction.user.id],
                },
              ]);
              await interaction.update({
                components: [loanContainer],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {},
              });
              break;
            }
          }
        },
      },
    ]);

    await interaction.reply({
      components: [bankContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: {},
    });
  }

  private async loanStringSelectHandler(
    interaction: StringSelectMenuInteraction,
  ): Promise<StringSelectMenuBuilder> {
    const activeLoan = await LoanLog.findOne({
      where: {
        userId: interaction.user.id,
        isPaid: false,
      },
    });

    if (activeLoan) {
      return new StringSelectMenuBuilder()
        .setCustomId('loanStart')
        .setPlaceholder('Chọn yêu cầu của bạn')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Trả khoản vay trước đó')
            .setValue('loanRepay'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Xem thông tin khoản vay trước đó')
            .setValue('loanInfo'),
        );
    }

    return new StringSelectMenuBuilder()
      .setCustomId('loanStart')
      .setPlaceholder('Chọn yêu cầu của bạn')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Tạo khoản vay mới')
          .setValue('loanCreate'),
      );
  }

  private getMaxLoan(creditScore: number): number {
    if (creditScore >= 750) return this.maxLoan;
    if (creditScore >= 650) return this.maxLoan - 20000;
    if (creditScore >= 550) return this.maxLoan - 35000;
    if (creditScore >= 450) return this.maxLoan - 42500;
    return this.maxLoan - 45000;
  }

  private getInterestRate(creditScore: number): number {
    if (creditScore >= 750) return this.baseInterest - 0.05;
    if (creditScore >= 650) return this.baseInterest - 0.025;
    if (creditScore >= 550) return this.baseInterest;
    if (creditScore >= 450) return this.baseInterest + 0.25;
    return this.baseInterest + 0.05;
  }

  private getCreditScoreRating(creditScore: number): string {
    if (creditScore >= 750) return 'Xuất sắc';
    if (creditScore >= 650) return 'Tốt';
    if (creditScore >= 550) return 'Trung bình';
    if (creditScore >= 450) return 'Kém';
    return 'Rất kém';
  }
}
