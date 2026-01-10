import {Command} from '../../../Command';
import {ChatInputCommandInteraction, PermissionFlagsBits} from 'discord.js';
import Balance from '../../../../database/models/Balance.model';

export default class BalanceCommand extends Command {
  constructor() {
    super('balance', 'Manage user balances');

    this.advancedOptions.cooldown = 5000;

    this.data
      .addSubcommand(subcommand =>
        subcommand
          .setName('show')
          .setDescription('Show balance of a user')
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('User to check balance (defaults to yourself)')
              .setRequired(false),
          ),
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('set')
          .setDescription('Set balance of a user (requires Manage Guild)')
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('User to set balance for')
              .setRequired(true),
          )
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('Amount to set')
              .setRequired(true),
          ),
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Add balance to a user (requires Manage Guild)')
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('User to add balance to')
              .setRequired(true),
          )
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('Amount to add')
              .setRequired(true),
          ),
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove')
          .setDescription('Remove balance from a user (requires Manage Guild)')
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('User to remove balance from')
              .setRequired(true),
          )
          .addNumberOption(option =>
            option
              .setName('amount')
              .setDescription('Amount to remove')
              .setRequired(true),
          ),
      );
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'show':
        await this.handleShow(interaction);
        break;
      case 'set':
        await this.handleSet(interaction);
        break;
      case 'add':
        await this.handleAdd(interaction);
        break;
      case 'remove':
        await this.handleRemove(interaction);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown subcommand!',
          ephemeral: true,
        });
    }
  }

  private async handleShow(interaction: ChatInputCommandInteraction) {
    const userId =
      interaction.options.getUser('user')?.id || interaction.user.id;

    const [balance, created] = await Balance.findOrCreate({
      where: {userId},
      defaults: {userId, balance: 0},
    });

    if (created) {
      await interaction.reply(`💰 Created new balance for <@${userId}>: **0**`);
    } else {
      await interaction.reply(
        `💰 Balance for <@${userId}>: **${balance.balance}**`,
      );
    }
  }

  private async handleSet(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ You need **Manage Guild** permission to use this command!',
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const amount = interaction.options.getNumber('amount', true);

    if (amount < 0) {
      await interaction.reply({
        content: '❌ Amount cannot be negative!',
        ephemeral: true,
      });
      return;
    }

    const [balance] = await Balance.findOrCreate({
      where: {userId: user.id},
      defaults: {userId: user.id, balance: 0},
    });

    await balance.update({balance: amount});

    await interaction.reply(
      `✅ Set balance for <@${user.id}> to **${amount}**`,
    );
  }

  private async handleAdd(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ You need **Manage Guild** permission to use this command!',
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const amount = interaction.options.getNumber('amount', true);

    if (amount <= 0) {
      await interaction.reply({
        content: '❌ Amount must be positive!',
        ephemeral: true,
      });
      return;
    }

    const [balance] = await Balance.findOrCreate({
      where: {userId: user.id},
      defaults: {userId: user.id, balance: 0},
    });

    const newBalance = balance.balance + amount;
    await balance.update({balance: newBalance});

    await interaction.reply(
      `✅ Added **${amount}** to <@${user.id}>'s balance. New balance: **${newBalance}**`,
    );
  }

  private async handleRemove(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ You need **Manage Guild** permission to use this command!',
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const amount = interaction.options.getNumber('amount', true);

    if (amount <= 0) {
      await interaction.reply({
        content: '❌ Amount must be positive!',
        ephemeral: true,
      });
      return;
    }

    const [balance] = await Balance.findOrCreate({
      where: {userId: user.id},
      defaults: {userId: user.id, balance: 0},
    });

    const newBalance = balance.balance - amount;
    await balance.update({balance: newBalance});

    await interaction.reply(
      `✅ Removed **${amount}** from <@${user.id}>'s balance. New balance: **${newBalance}**`,
    );
  }
}
