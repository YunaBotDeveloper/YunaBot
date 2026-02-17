import {LocaleMap} from './types';

const vi: LocaleMap = {
  'container.loading': 'Đang xử lý...',

  'avatar.menu.name': 'Lấy ảnh đại diện',
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
  'avatar.auto_delete': '{emoji} Tin nhắn này sẽ tự động xoá trong {timestamp}',

  'banner.menu.name': 'Lấy ảnh bìa',
  'banner.description': 'Lấy ảnh bìa',
  'banner.option.user': 'Người dùng bạn chỉ định',
  'banner.failed': '{user} không có ảnh bìa.',
  'banner.title': 'Ảnh bìa của {user}',
  'banner.type.guild': 'Ảnh bìa trong máy chủ',
  'banner.type.global': 'Ảnh bìa toàn Discord',
  'banner.type_label': 'Loại:',
  'banner.switch_to_guild': 'Bấm vào đây để hiển thị ảnh bìa trong máy chủ',
  'banner.switch_to_global': 'Bấm vào đây để hiển thị ảnh bìa toàn Discord',
  'banner.switch_button': 'Đổi loại ảnh bìa',
  'banner.download_hint': 'Bấm vào đây để tải ảnh bìa',
  'banner.download_button': 'Tải xuống',
  'banner.auto_delete': '{emoji} Tin nhắn này sẽ tự động xoá trong {timestamp}',

  'help.description': 'Hiển thị toàn bộ lệnh',

  'nuke.description': 'Tạo lại kênh',
  'nuke.option.channel': 'kênh chỉ định',
  'nuke.option.reason': 'lý do tạo lại kênh',

  'setup.description': 'Cài đặt cho bot',
  'setup.subcommand.prefix': 'Cài đặt prefix',
  'setup.subcommand.log': 'Cài đặt kênh nhật ký',
  'setup.subcommand.verify': 'Cài đặt xác minh người dùng',

  'setup.log.title': 'Cài đặt kênh nhật ký',
  'setup.log.nuke_label': 'Nhật ký tạo lại kênh',
  'setup.log.nuke_placeholder': 'Chọn kênh nhật ký tạo lại kênh',
  'setup.log.msgdelete_label': 'Nhật ký xoá tin nhắn',
  'setup.log.msgdelete_placeholder': 'Chọn kênh nhật ký xoá tin nhắn',
  'setup.log.save': 'Lưu',
  'setup.log.timeout': 'Đã hết thời gian chờ, vui lòng thử lại!',
  'setup.log.saved': 'Đã lưu cài đặt nhật ký!',
  'setup.log.saved_nuke': '- Nhật ký tạo lại kênh: <#{channel}>',
  'setup.log.saved_msgdelete': '- Nhật ký xoá tin nhắn: <#{channel}>',
  'setup.log.cleared': 'Đã xoá tất cả kênh nhật ký!',

  'setup.prefix.title': 'Cài đặt prefix',
  'setup.prefix.current_label': 'Prefix hiện tại',
  'setup.prefix.current_value': 'Prefix hiện tại: `{prefix}`',
  'setup.prefix.input_label': 'Prefix mới',
  'setup.prefix.input_placeholder': 'Nhập prefix mới (tối đa 10 ký tự)',
  'setup.prefix.save': 'Lưu',
  'setup.prefix.reset': 'Đặt lại mặc định',
  'setup.prefix.timeout': 'Đã hết thời gian chờ, vui lòng thử lại!',
  'setup.prefix.saved': 'Đã thay đổi prefix thành: `{prefix}`',
  'setup.prefix.reset_success': 'Đã đặt lại prefix về mặc định: `{prefix}`',
  'setup.prefix.invalid': 'Prefix không hợp lệ! Phải từ 1-10 ký tự.',
  'setup.prefix.modal_title': 'Đổi Prefix',

  'prefix.description': 'Xem hoặc thay đổi prefix cho bot trong máy chủ này',
  'prefix.option.new_prefix': 'Prefix mới (để trống để xem prefix hiện tại)',
  'prefix.option.reset': 'Đặt lại prefix về mặc định (!)',
  'prefix.guild_only': 'Lệnh này chỉ có thể dùng trong máy chủ!',
  'prefix.reset_title': 'Đã đặt lại Prefix',
  'prefix.reset_description': 'Prefix đã được đặt lại về mặc định: `{prefix}`',
  'prefix.updated_title': 'Đã cập nhật Prefix',
  'prefix.updated_description': 'Prefix đã được thay đổi thành: `{prefix}`',
  'prefix.updated_example': '{prefix}help',
  'prefix.current_title': 'Prefix máy chủ',
  'prefix.current_description':
    'Prefix hiện tại của máy chủ này là: `{prefix}`',
  'prefix.default_prefix': 'Prefix mặc định',
  'prefix.example': 'Ví dụ',
  'prefix.change_hint': 'Dùng /prefix <prefix_mới> để thay đổi',

  'test.description': 'Tính năng thử nghiệm',
};

export default vi;
