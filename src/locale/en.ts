import {LocaleMap} from './types';

const en: LocaleMap = {
  // ─── Command: Avatar ───────────────────────────────────────────
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

  // ─── Command: Banner ───────────────────────────────────────────
  'banner.description': 'Get user banner',
  'banner.option.user': 'The user you want to target',

  // ─── Command: Help ─────────────────────────────────────────────
  'help.description': 'Show all commands',

  // ─── Command: Nuke ─────────────────────────────────────────────
  'nuke.description': 'Recreate a channel',
  'nuke.option.channel': 'Target channel',
  'nuke.option.reason': 'Reason for recreating the channel',

  // ─── Command: Setup ────────────────────────────────────────────
  'setup.description': 'Bot settings',
  'setup.subcommand.log': 'Set up log channel',
  'setup.subcommand.verify': 'Set up user verification',

  // ─── Command: Prefix ───────────────────────────────────────────
  'prefix.description': 'View or change the bot prefix for this server',
  'prefix.option.new_prefix':
    'The new prefix to set (leave empty to view current prefix)',
  'prefix.option.reset': 'Reset the prefix to default (!)',

  // ─── Command: Test ─────────────────────────────────────────────
  'test.description': 'Test feature',
};

export default en;
