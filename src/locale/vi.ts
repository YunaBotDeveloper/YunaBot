import {LocaleMap} from './types';

const vi: LocaleMap = {
  // ─── Command: Avatar ───────────────────────────────────────────
  'avatar.description': 'Lấy ảnh đại diện',
  'avatar.option.user': 'Người dùng bạn chỉ định',
  'avatar.title': 'Ảnh đại diện của {user}',
  'avatar.type.guild': 'Ảnh đại diện trong máy chủ',
  'avatar.type.global': 'Ảnh đại diện toàn Discord',
  'avatar.type_label': 'Loại:',
  'avatar.switch_to_guild':
    'Bấm vào đây để hiển thị ảnh đại diện trong máy chủ',
  'avatar.switch_to_global':
    'Bấm vào đây để hiển thị ảnh đại diện toàn Discord',
  'avatar.switch_button': 'Đổi loại ảnh đại diện',
  'avatar.download_hint': 'Bấm vào đây để tải ảnh đại diện',
  'avatar.download_button': 'Tải xuống',
  'avatar.auto_delete': '{emoji} Tin nhắn này sẽ tự động xoá {timestamp}',

  // ─── Command: Banner ───────────────────────────────────────────
  'banner.description': 'Lấy ảnh bìa',
  'banner.option.user': 'Người dùng bạn chỉ định',

  // ─── Command: Help ─────────────────────────────────────────────
  'help.description': 'Hiển thị toàn bộ lệnh',

  // ─── Command: Nuke ─────────────────────────────────────────────
  'nuke.description': 'Tạo lại kênh',
  'nuke.option.channel': 'kênh chỉ định',
  'nuke.option.reason': 'lý do tạo lại kênh',

  // ─── Command: Setup ────────────────────────────────────────────
  'setup.description': 'Cài đặt cho bot',
  'setup.subcommand.log': 'Cài đặt kênh nhật ký',
  'setup.subcommand.verify': 'Cài đặt xác minh người dùng',

  // ─── Command: Prefix ───────────────────────────────────────────
  'prefix.description': 'Xem hoặc thay đổi prefix cho bot trong máy chủ này',
  'prefix.option.new_prefix': 'Prefix mới (để trống để xem prefix hiện tại)',
  'prefix.option.reset': 'Đặt lại prefix về mặc định (!)',

  // ─── Command: Test ─────────────────────────────────────────────
  'test.description': 'Tính năng thử nghiệm',
};

export default vi;
