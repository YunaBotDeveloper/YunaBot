import {LocaleMap} from './types';

const en: LocaleMap = {
  'container.loading': 'Processing',

  'avatar.menu.name': 'Get user avatar',
  'avatar.description': 'Get user avatar',
  'avatar.option.user': 'The user you want to target',
  'avatar.title': 'Avatar of {user}',
  'avatar.type.guild': 'Server avatar',
  'avatar.type.global': 'Global Discord avatar',
  'avatar.type_label': 'Type:',
  'avatar.switch_to_guild': 'Click here to show server avatar',
  'avatar.switch_to_global': 'Click here to show global Discord avatar',
  'avatar.switch_button': 'Switch avatar type',
  'avatar.download_hint': 'Click here to download avatar',
  'avatar.download_button': 'Download',
  'avatar.auto_delete':
    '{emoji} This message will be automatically deleted {timestamp}',

  'banner.menu.name': 'Get user banner',
  'banner.description': 'Get user banner',
  'banner.option.user': 'The user you want to target',
  'banner.failed': "{user} doesn't have banner.",
  'banner.title': 'Banner of {user}',
  'banner.type.guild': 'Server banner',
  'banner.type.global': 'Global Discord banner',
  'banner.type_label': 'Type:',
  'banner.switch_to_guild': 'Click here to show server banner',
  'banner.switch_to_global': 'Click here to show global Discord banner',
  'banner.switch_button': 'Switch banner type',
  'banner.download_hint': 'Click here to download banner',
  'banner.download_button': 'Download',
  'banner.auto_delete':
    '{emoji} This message will be automatically deleted {timestamp}',

  'help.description': 'Show all commands',

  'nuke.description': 'Recreate a channel',
  'nuke.option.channel': 'Target channel',
  'nuke.option.reason': 'Reason for recreating the channel',

  'setup.description': 'Bot settings',
  'setup.subcommand.prefix': 'Set up prefix',
  'setup.subcommand.log': 'Set up log channel',
  'setup.subcommand.verify': 'Set up user verification',

  'setup.log.title': 'Log channel settings',
  'setup.log.nuke_label': 'Channel recreation log',
  'setup.log.nuke_placeholder': 'Select channel recreation log channel',
  'setup.log.msgdelete_label': 'Message deletion log',
  'setup.log.msgdelete_placeholder': 'Select message deletion log channel',
  'setup.log.save': 'Save',
  'setup.log.timeout': 'Timed out, please try again!',
  'setup.log.saved': 'Log settings saved!',
  'setup.log.saved_nuke': '- Channel recreation log: <#{channel}>',
  'setup.log.saved_msgdelete': '- Message deletion log: <#{channel}>',
  'setup.log.cleared': 'All log channels have been removed!',

  'setup.prefix.title': 'Prefix settings',
  'setup.prefix.current_label': 'Current prefix',
  'setup.prefix.current_value': 'Current prefix: `{prefix}`',
  'setup.prefix.input_label': 'New prefix',
  'setup.prefix.input_placeholder': 'Enter a new prefix (max 10 characters)',
  'setup.prefix.save': 'Save',
  'setup.prefix.reset': 'Reset to default',
  'setup.prefix.timeout': 'Timed out, please try again!',
  'setup.prefix.saved': 'Prefix has been changed to: `{prefix}`',
  'setup.prefix.reset_success': 'Prefix has been reset to default: `{prefix}`',
  'setup.prefix.invalid': 'Invalid prefix! Must be 1-10 characters.',
  'setup.prefix.modal_title': 'Change Prefix',

  'prefix.description': 'View or change the bot prefix for this server',
  'prefix.option.new_prefix':
    'The new prefix to set (leave empty to view current prefix)',
  'prefix.option.reset': 'Reset the prefix to default (!)',
  'prefix.guild_only': 'This command can only be used in a server!',
  'prefix.reset_title': 'Prefix Reset',
  'prefix.reset_description':
    'The prefix has been reset to the default: `{prefix}`',
  'prefix.updated_title': 'Prefix Updated',
  'prefix.updated_description': 'The prefix has been changed to: `{prefix}`',
  'prefix.updated_example': '{prefix}help',
  'prefix.current_title': 'Server Prefix',
  'prefix.current_description':
    'The current prefix for this server is: `{prefix}`',
  'prefix.default_prefix': 'Default Prefix',
  'prefix.example': 'Example',
  'prefix.change_hint': 'Use /prefix <new_prefix> to change it',

  'test.description': 'Test feature',
};

export default en;
