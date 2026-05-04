// dict.js - i18n 字典文件
// 所有 Key 使用 qra_ 前缀，防止与酒馆原生文本冲突

export const dictionaries = {
    'en': {
        // === Tab 标签 ===
        'qra_tab_main': 'Main Settings',
        'qra_tab_whitelist': 'Whitelist',
        'qra_tab_icon': 'Button Icon',

        // === 主设置页 ===
        'qra_label_version': 'Version',
        'qra_btn_check_update': 'Check for Updates',
        'qra_opt_enable': 'Enable extension',
        'qra_opt_disable': 'Disable extension',
        'qra_label_ui_theme': 'UI Theme',
        'qra_theme_default': 'Default',
        'qra_theme_system': 'Follow System',
        'qra_theme_sakura': 'Sakura',
        'qra_theme_classical': 'Classical',
        'qra_theme_dark': 'Dark',
        'qra_theme_paper': 'Washi (Paper)',
        'qra_theme_ceramic': 'White Porcelain',
        'qra_theme_lavender': 'Lavender',
        'qra_theme_smoked': 'Smoked',
        'qra_theme_aurora': 'Aurora',
        'qra_theme_forest': 'Misty Forest',

        // 卡片标题
        'qra_card_autoshrink_title': 'Auto-Hide Buttons',
        'qra_card_autoshrink_desc': 'Auto-hide the button bar above the chat input',
        'qra_card_backdrop_title': 'Background Blur',
        'qra_card_backdrop_desc': 'Apply a frosted glass blur effect behind the menu',
        'qra_card_combined_title': 'Merge Quick Replies (QR v2)',
        'qra_card_combined_desc': 'Merge all separate Quick Reply panels into one (Syncs with QR v2)',
        'qra_card_sort_title': 'Button Sorting',
        'qra_card_sort_desc': 'Customize the order of menu buttons',
        'qra_card_help_title': 'Usage Guide',
        'qra_card_help_desc': 'View detailed feature descriptions and help',
        'qra_card_log_title': 'System Logs',
        'qra_card_log_desc': 'View extension status, troubleshoot issues, or export logs',

        'qra_btn_settings': 'Settings',
        'qra_btn_open': 'Open',

        // 日志
        'qra_log_level_debug': 'DEBUG (All)',
        'qra_log_level_info': 'INFO (Normal)',
        'qra_log_level_warn': 'WARN (Warnings Only)',
        'qra_log_level_error': 'ERROR (Errors Only)',
        'qra_btn_view_logs': 'View Logs',
        'qra_btn_download_logs': 'Download Logs',

        // === 白名单页 ===
        'qra_whitelist_hidden': 'Hidden List',
        'qra_whitelist_visible': 'Whitelist (Visible)',
        'qra_whitelist_help_p1': 'Click any entry in the lists above to move it between the two lists.',
        'qra_whitelist_help_p2': 'Items in the Whitelist will remain above the chat input bar, while items in the Hidden List will appear inside the QR Assistant menu instead.',
        'qra_whitelist_help_p3': 'On mobile, long-press any QR or script entry to view its source and scope.',
        'qra_whitelist_help_p4': 'Icons: <i class="fa-solid fa-sun"></i> = LittleWhiteBox script, <i class="fa-solid fa-star"></i> = Quick Reply, <i class="fa-solid fa-moon"></i> = JSR script, <i class="fa-solid fa-puzzle-piece"></i> = SiilyTavern extension.',

        // === 图标设置页 ===
        'qra_icon_source_builtin': 'Built-in Icons',
        'qra_icon_source_character': 'Current Character Card',
        'qra_icon_source_custom': 'Custom Icons',

        // 内置图标名称
        'qra_icon_rocket': 'Rocket',
        'qra_icon_bolt': 'Hexagram',
        'qra_icon_comment': 'Palette',
        'qra_icon_star': 'Star & Crescent',
        'qra_icon_fan': 'Pinwheel',
        'qra_icon_pencil': 'Pencil',
        'qra_icon_book': 'Book',
        'qra_icon_mug': 'Hot Coffee',
        'qra_icon_crown': 'Crown',
        'qra_icon_gem': 'Diamond',
        'qra_icon_headphones': 'Headphones',

        'qra_label_btn_icon': 'Button Icon',
        'qra_label_preview': 'Preview',
        'qra_label_icon_size': 'Icon Size',
        'qra_opt_size_match': 'Match Send Button Size',
        'qra_opt_size_custom': 'Custom Icon Size',
        'qra_label_size_em': 'Size (em)',

        'qra_char_desc': 'Use the current character\'s avatar as the button icon. Updates automatically when switching chats.',
        'qra_char_no_avatar': 'No Character Avatar',
        'qra_char_avatar_rotation': 'Enable Avatar Rotation Animation',

        'qra_custom_placeholder': '-- Select or Add --',
        'qra_custom_no_icon': 'No Icon',
        'qra_btn_manage_icons': 'Manage Icons',
        'qra_btn_add_icon': 'Add Icon',

        // === 弹窗 ===
        'qra_modal_manage_title': 'Manage Custom Icons',
        'qra_modal_add_title': 'Add Custom Icon',
        'qra_modal_edit_title': 'Edit Icon',
        'qra_label_name': 'Name',
        'qra_label_icon_url': 'Icon URL',
        'qra_link_image_host': 'Free Image Host',
        'qra_label_icon_size_hint': 'Icon size (default 1.2 means matching the send button size. Do not change unless you want to force a larger or smaller icon):',
        'qra_placeholder_name': 'e.g. Paimon',
        'qra_placeholder_url': 'Enter image hosting URL',
        'qra_btn_save': 'Save',
        'qra_btn_cancel': 'Cancel',
        'qra_btn_save_changes': 'Save Changes',
        'qra_btn_back': 'Back',
        'qra_btn_close': 'Close',
        'qra_no_saved_icons': 'No saved icons',

        // 确认/提示
        'qra_confirm_delete_icon': 'Are you sure you want to delete this icon?',
        'qra_alert_name_url_required': 'Name and URL cannot be empty',
        'qra_alert_url_required': 'Please enter an icon URL',
        'qra_confirm_update': 'The update will refresh the page. Make sure you have saved your conversation.\nProceed with update?',
        'qra_alert_update_sent': 'Update command sent. The page will refresh shortly.',
        'qra_alert_update_failed': 'Update failed. Check the console for details.',
        'qra_alert_update_error': 'Update request error: ',
        'qra_confirm_clear_logs': 'Are you sure you want to clear all logs?',
        'qra_toastr_export_failed': 'Failed to export logs. Check console for details.',

        // 更新相关
        'qra_checking': 'Checking...',
        'qra_up_to_date': 'Up to Date',
        'qra_new_version_found': 'New Version Found',
        'qra_check_failed': 'Check Failed',
        'qra_btn_check_update': 'Check for Updates',
        'qra_label_current_version': 'Version',

        // 更新弹窗
        'qra_modal_update_title': 'extension Update Log',
        'qra_update_tip': 'If the update fails, you can manually update QR Assistant from the Extensions management page. If it still fails, try deleting and reinstalling the extension.',
        'qra_btn_update_now': 'Update Now',
        'qra_loading_changelog': 'Loading changelog...',
        'qra_changelog_unavailable': 'Unable to fetch changelog.',

        // === 来源/作用域 ===
        'qra_source_unknown': 'Unknown Source',
        'qra_source_jsr': 'Tavern Helper (JSR)',
        'qra_source_qr': 'Quick Reply (QR)',
        'qra_source_lwb': 'LittleWhiteBox (LWB)',
        'qra_source_thirdparty': 'SillyTavern extension',
        'qra_scope_global': 'Global',
        'qra_scope_character': 'Character',
        'qra_scope_preset': 'Preset',

        // 空状态
        'qra_empty_scripts': 'No available script buttons',
        'qra_empty_standard': 'No available quick replies',

        // 菜单错误
        'qra_menu_render_error': 'Menu Render Error',
        'qra_menu_check_console': 'Press F12 to view console logs',

        // === 设置项帮助说明 ===
        'qra_help_tooltip': 'View details',
        'qra_setting_help_autoshrink': 'When enabled, the extension will collapse the button area above the chat input box.\n\nMoving the mouse over or clicking the input box area will automatically expand and display all buttons.\n\nThis feature works well with the whitelist, as only whitelisted buttons (or Input Helper buttons) will remain visible above the chat input. If you are not familiar with or do not use the whitelist or Input Helper, you can leave this disabled.',
        'qra_setting_help_backdrop': 'When enabled, opening the QR Assistant menu (via the button to the left of the send button) will apply a blur effect to the background.\n\nFor example, it\'s like switching apps on a smartphone, where the background becomes blurred. This feature creates a similar frosted glass effect.\n\nAs a result, it helps reduce visual fatigue (recommended).',
        'qra_setting_help_combined': 'When enabled, the buttons above the chat input box will stick together in a single row, rather than displaying on separate lines for each script/QR set.\n\nThis feature is intended to be used alongside the whitelist, as only whitelisted buttons will remain visible above the chat input area.\n\nThis setting is exactly the same as the native "Merge Quick Replies" toggle in SillyTavern. You can toggle it from either Quick Reply or QR Assistant, as they sync bidirectionally.\n\nWe duplicated this toggle in QR Assistant simply to make it more convenient to enable or disable.',

        // === 帮助弹窗 ===
        'qra_help_title': 'QR Assistant - Help',
        'qra_help_toc_video': 'Video Demo',
        'qra_help_toc_core': 'Core Features',
        'qra_help_toc_detail': 'Features',
        'qra_help_toc_whitelist': 'Whitelist',
        'qra_help_toc_icons': 'Button Icons',
        'qra_help_toc_theme': 'UI Theme',
        'qra_help_toc_sort': 'Button Sorting',
        'qra_help_toc_others': 'Other Features',
        'qra_help_toc_compat': 'extension Compatibility',
        'qra_help_toc_update': 'Update Check',

        // === 日志弹窗 ===
        'qra_log_title': 'Runtime Logs',
        'qra_btn_copy': 'Copy',
        'qra_btn_download': 'Download',
        'qra_btn_clear': 'Clear',

        // === 排序弹窗 ===
        'qra_sort_title': 'Menu Button Sorting',
        'qra_sort_enable': 'Enable Custom Sorting',
        'qra_sort_desc': 'This mode allows you to customize the button order on the QR menu.\nWhen disabled, the buttons on the QR menu will be auto-arranged (default mode).\nWhen enabled, the buttons will be displayed on the QR menu in the order shown below, so you can drag the group buttons below to customize their arrangement.',
        'qra_sort_del_record': 'Delete Record',

        // === 首次设置栏 ===
        'qra_onboarding_theme': 'Quick Appearance',
        'qra_onboarding_icon': 'Set Icon',
        'qra_onboarding_blur': 'Background Blur',
        'qra_onboarding_done': 'Done',
        'qra_onboarding_char_card': 'Character Card',
        'qra_onboarding_builtin': 'Built-in Icons',
        'qra_onboarding_custom': 'Custom Icons',
        'qra_onboarding_custom_guide_title': 'Add Custom Icon',
        'qra_onboarding_custom_guide_text': 'Go to the Extensions menu <i class="fa-solid fa-cubes"></i> in the top bar, find <strong>QR Assistant</strong>, switch to the <strong>"Button Icon"</strong> page to add and enable custom icons.',
        'qra_onboarding_got_it': 'Got it',

        // 杂项
        'qra_custom_select': '-- Select --',
        'qra_copied': 'Copied!',
        'qra_extension_name': 'QR Assistant',
        'qra_rocket_btn_title': 'Quick Reply Menu',

        // Tooltip 标签
        'qra_tooltip_source': 'Source',
        'qra_tooltip_scope': 'Scope',
        'qra_tooltip_belong': 'Belongs to',

        // 按钮提示
        'qra_title_edit': 'Edit',
        'qra_title_delete': 'Delete',
        'qra_title_close': 'Close',
        'qra_title_toc': 'Table of Contents',
        'qra_unnamed_icon': 'Unnamed Icon',
        'qra_stack_trace': 'View Error Stack Trace',

        // 排序弹窗补充
        'qra_sort_group_empty': 'No valid buttons found in memory for this group',
        'qra_sort_expand_collapse': 'Expand/Collapse',
        'qra_btn_read': 'Read',
    },

    'zh-tw': {
        // === Tab 標籤 ===
        'qra_tab_main': '主設定',
        'qra_tab_whitelist': '白名單',
        'qra_tab_icon': '按鈕圖示',

        // === 主設定頁 ===
        'qra_label_version': '版本',
        'qra_btn_check_update': '檢查更新',
        'qra_opt_enable': '啟用擴充',
        'qra_opt_disable': '停用擴充',
        'qra_label_ui_theme': 'UI 主題',
        'qra_theme_default': '預設',
        'qra_theme_system': '跟隨酒館',
        'qra_theme_sakura': '櫻花',
        'qra_theme_classical': '古典',
        'qra_theme_dark': '暗黑',
        'qra_theme_paper': '和紙',
        'qra_theme_ceramic': '白瓷',
        'qra_theme_lavender': '薰衣草',
        'qra_theme_smoked': '煙燻',
        'qra_theme_aurora': '極光',
        'qra_theme_forest': '迷霧森林',

        // 卡片
        'qra_card_autoshrink_title': '按鈕自動折疊',
        'qra_card_autoshrink_desc': '自動折疊聊天輸入框上方的按鈕區域',
        'qra_card_backdrop_title': '背景模糊效果',
        'qra_card_backdrop_desc': '開啟選單時對背景套用毛玻璃模糊遮罩',
        'qra_card_combined_title': '合併快速回覆',
        'qra_card_combined_desc': '將所有獨立的快捷回覆面板合併為一個',
        'qra_card_sort_title': '選單按鈕排序',
        'qra_card_sort_desc': '允許對選單按鈕進行自訂排序',
        'qra_card_help_title': '擴充使用說明',
        'qra_card_help_desc': '檢視關於本擴充的詳細功能介紹與幫助',
        'qra_card_log_title': '系統日誌',
        'qra_card_log_desc': '檢視擴充執行狀態、排查問題或匯出日誌報告',

        'qra_btn_settings': '設定',
        'qra_btn_open': '開啟',

        // 日誌
        'qra_log_level_debug': 'DEBUG (全部)',
        'qra_log_level_info': 'INFO (常規)',
        'qra_log_level_warn': 'WARN (僅警告)',
        'qra_log_level_error': 'ERROR (僅錯誤)',
        'qra_btn_view_logs': '檢視日誌',
        'qra_btn_download_logs': '下載日誌',

        // === 白名單頁 ===
        'qra_whitelist_hidden': '收納列表 (隱藏)',
        'qra_whitelist_visible': '白名單列表 (顯示)',
        'qra_whitelist_help_p1': '直接點選上方列表中的選項即可將對應選項按鈕移動到另一側列表中。',
        'qra_whitelist_help_p2': '在白名單列表中的選項按鈕將保留在聊天輸入框上方，不會顯示在QR助手的選單面板中；而在收納列表中的選項按鈕則會出現在選單面板中，不出現在聊天輸入框上方。',
        'qra_whitelist_help_p3': '手機使用者長按列表中對應的QR或指令碼選項，可以檢視該選項具體的來源和作用域。',
        'qra_whitelist_help_p4': '此外，<i class="fa-solid fa-sun"></i> 表示為小白X指令碼，<i class="fa-solid fa-star"></i> 表示為QR，<i class="fa-solid fa-moon"></i> 表示為酒館助手指令碼，而 <i class="fa-solid fa-puzzle-piece"></i> 表示為酒館拓展。',

        // === 圖示設定頁 ===
        'qra_icon_source_builtin': '內建圖示',
        'qra_icon_source_character': '目前角色卡',
        'qra_icon_source_custom': '自訂圖示',

        'qra_icon_rocket': '小火箭',
        'qra_icon_bolt': '六芒星',
        'qra_icon_comment': '調色盤',
        'qra_icon_star': '星月',
        'qra_icon_fan': '風車',
        'qra_icon_pencil': '小鉛筆',
        'qra_icon_book': '書本',
        'qra_icon_mug': '熱咖啡',
        'qra_icon_crown': '皇冠',
        'qra_icon_gem': '鑽石',
        'qra_icon_headphones': '耳機',

        'qra_label_btn_icon': '按鈕圖示',
        'qra_label_preview': '預覽',
        'qra_label_icon_size': '圖示大小',
        'qra_opt_size_match': '與傳送按鈕保持一致大小',
        'qra_opt_size_custom': '自訂內建圖示大小',
        'qra_label_size_em': '大小 (em)',

        'qra_char_desc': '顯示目前聊天角色的頭像作為按鈕圖示，切換聊天時自動更新',
        'qra_char_no_avatar': '無角色頭像',
        'qra_char_avatar_rotation': '開啟頭像旋轉動畫',

        'qra_custom_placeholder': '-- 請選擇或新增 --',
        'qra_custom_no_icon': '無圖示',
        'qra_btn_manage_icons': '管理圖示',
        'qra_btn_add_icon': '新增圖示',

        // === 彈窗 ===
        'qra_modal_manage_title': '管理自訂圖示',
        'qra_modal_add_title': '新增自訂圖示',
        'qra_modal_edit_title': '編輯圖示',
        'qra_label_name': '名稱',
        'qra_label_icon_url': '圖示 URL',
        'qra_link_image_host': '免費圖床',
        'qra_label_icon_size_hint': '圖示大小 (預設值1.2表示與傳送按鈕保持一致大小。因此非必要請不要修改該值，除非您確實想要強制調大或調小該圖示):',
        'qra_placeholder_name': '例如: 派蒙',
        'qra_placeholder_url': '輸入圖片的圖床連結',
        'qra_btn_save': '儲存',
        'qra_btn_cancel': '取消',
        'qra_btn_save_changes': '儲存修改',
        'qra_btn_back': '返回',
        'qra_btn_close': '關閉',
        'qra_no_saved_icons': '暫無儲存的圖示',

        // 確認/提示
        'qra_confirm_delete_icon': '確定要刪除這個圖示嗎？',
        'qra_alert_name_url_required': '名稱和連結不能為空',
        'qra_alert_url_required': '請輸入圖示連結',
        'qra_confirm_update': '更新操作將重整頁面，請確保已儲存對話。\n確定更新嗎？',
        'qra_alert_update_sent': '更新指令已傳送，頁面即將重整。',
        'qra_alert_update_failed': '更新失敗，請檢視控制檯日誌。',
        'qra_alert_update_error': '更新請求發生錯誤: ',
        'qra_confirm_clear_logs': '確定清空所有日誌嗎？',
        'qra_toastr_export_failed': '匯出日誌失敗，請檢視控制檯',

        // 更新相關
        'qra_checking': '檢測中...',
        'qra_up_to_date': '已是最新',
        'qra_new_version_found': '發現新版本',
        'qra_check_failed': '檢測失敗',
        'qra_btn_check_update': '檢查更新',
        'qra_label_current_version': '版本',

        // 更新彈窗
        'qra_modal_update_title': '擴充更新日誌',
        'qra_update_tip': '如果更新失敗，可以在酒館擴充頁面的【管理擴充程式】列表中手動更新QR助手。如果依然更新失敗，則可以嘗試刪除重裝來使用最新版本擴充。',
        'qra_btn_update_now': '立即更新',
        'qra_loading_changelog': '正在載入更新日誌...',
        'qra_changelog_unavailable': '無法獲取更新日誌。',

        // === 來源/作用域 ===
        'qra_source_unknown': '未知來源',
        'qra_source_jsr': '酒館助手 (JSR)',
        'qra_source_qr': '快速回覆 (QR)',
        'qra_source_lwb': '小白X (LWB)',
        'qra_source_thirdparty': '酒館拓展',
        'qra_scope_global': '全域',
        'qra_scope_character': '角色',
        'qra_scope_preset': '預設',

        // 空狀態
        'qra_empty_scripts': '沒有可用的指令碼按鈕',
        'qra_empty_standard': '沒有可用的快速回覆',

        // 選單錯誤
        'qra_menu_render_error': '選單渲染出錯',
        'qra_menu_check_console': '請按 F12 檢視控制檯詳細日誌',

        // === 設定項幫助說明 ===
        'qra_help_tooltip': '檢視詳細說明',
        'qra_setting_help_autoshrink': '啟用該功能後，外掛將會將聊天輸入框上方的按鈕區域都摺疊起來。\n\n而當點選滑鼠移動到或者手動點選輸入框區域時，則又會自動展開顯示所有按鈕。\n\n該功能可以與白名單按鈕搭配使用，因為只有白名單按鈕（或輸入助手按鈕）才會在聊天輸入框上方顯示。如果大家使用QR助手時，不瞭解或者沒有使用白名單功能以及輸入助手則可以不用開啟。',
        'qra_setting_help_backdrop': '啟用該功能後，當每次點選聊天輸入框右邊傳送按鈕左邊的QR助手按鈕打開菜單面板時，背景都會進行模糊處理。\n\n打個比方，這就跟手機切後臺一樣，切後臺時桌面是模糊的。該功能實現的就是這種效果，打開菜單面板時把背景模糊化處理。\n\n因此，該功能有利於減少視覺疲勞（推薦開啟）。',
        'qra_setting_help_combined': '啟用該功能後，將會使聊天輸入框上方的按鈕都緊貼在一塊，而不是每個腳本/QR的內的按鈕都單獨為一行。\n\n該功能也是搭配白名單功能使用的，因為只有移入白名單的按鈕才會保留顯示在聊天輸入框區域上方。\n\n這個功能實際上就是酒館原生的快速回覆中的「合併快速回覆」，是一個開關，作用完全一樣（大家在快速回覆或者QR助手中開啟/禁用該開關都是可以的，這兩個地方是雙向同步更新的）。\n\n在QR助手也重複做這個開關主要是方便大家進行啟用/禁用。',

        // === 幫助彈窗 ===
        'qra_help_title': 'QR助手 使用說明',
        'qra_help_toc_video': '影片範例',
        'qra_help_toc_core': '核心功能',
        'qra_help_toc_detail': '具體功能',
        'qra_help_toc_whitelist': '白名單',
        'qra_help_toc_icons': '按鈕圖示',
        'qra_help_toc_theme': 'UI 主題',
        'qra_help_toc_sort': '選單按鈕排序',
        'qra_help_toc_others': '其他功能',
        'qra_help_toc_compat': '相容其他擴充',
        'qra_help_toc_update': '檢測更新',

        // === 日誌彈窗 ===
        'qra_log_title': '執行日誌',
        'qra_btn_copy': '複製',
        'qra_btn_download': '下載',
        'qra_btn_clear': '清空',

        // === 排序彈窗 ===
        'qra_sort_title': '選單分組排序管理',
        'qra_sort_enable': '開啟自訂排序模式',
        'qra_sort_desc': '此模式允許您自訂排列QR選單上的按鈕順序。\n關閉時，QR選單上的按鈕將會自適應排列（預設模式）。\n開啟時，將會根據以下方式的排列顯示在QR選單上，因此你可以自行拖曳以下分組按鈕進行自訂排列。',
        'qra_sort_del_record': '刪除記錄',

        // === 首次設定欄 ===
        'qra_onboarding_theme': '快速外觀設定',
        'qra_onboarding_icon': '設定圖示',
        'qra_onboarding_blur': '背景模糊',
        'qra_onboarding_done': '完成設定',
        'qra_onboarding_char_card': '目前角色卡',
        'qra_onboarding_builtin': '內建圖示',
        'qra_onboarding_custom': '自訂圖示',
        'qra_onboarding_custom_guide_title': '新增自訂圖示',
        'qra_onboarding_custom_guide_text': '請點選酒館頂部選單列的 <i class="fa-solid fa-cubes"></i> 擴充管理圖示，找到 <strong>【QR助手】</strong>，切換到 <strong>"圖示按鈕"</strong> 頁面新增並啟用自訂圖示。',
        'qra_onboarding_got_it': '知道了',

        // 雜項
        'qra_custom_select': '-- 請選擇 --',
        'qra_copied': '已複製!',
        'qra_extension_name': 'QR助手',
        'qra_rocket_btn_title': '快速回覆選單',

        // Tooltip 標籤
        'qra_tooltip_source': '來源',
        'qra_tooltip_scope': '範圍',
        'qra_tooltip_belong': '歸屬',

        // 按鈕提示
        'qra_title_edit': '編輯',
        'qra_title_delete': '刪除',
        'qra_title_close': '關閉',
        'qra_title_toc': '目錄',
        'qra_unnamed_icon': '未命名圖示',
        'qra_stack_trace': '查看錯誤堆疊 (Stack Trace)',

        // 排序彈窗補充
        'qra_sort_group_empty': '該分組目前在記憶體中找不到有效按鈕',
        'qra_sort_expand_collapse': '展開/收合',
        'qra_btn_read': '已閱',
    }
};

// === 使用说明多语言块 ===
export const helpDocs = {
    'en': `
    <h2 id="help-video">Video Demo</h2>
    <div class="qr-help-video-container">
        <video controls controlsList="nodownload" preload="metadata">
            <source src="https://files.catbox.moe/mu8kg5.mp4" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    </div>

    <h2 id="help-core">Core Features</h2>
    <ul>
        <li>Collects all buttons from above the chat input bar into a single menu, accessible via the icon to the left of the send button.</li>
    </ul>
    <blockquote>
        The extension provides a <code>Whitelist</code> feature. Buttons in the whitelist will remain above the input bar instead of being moved to the menu, so you can selectively keep some buttons visible (e.g., Input Helper).
    </blockquote>

    <h2 id="help-detail">Feature Details</h2>

    <h3 id="help-whitelist">Whitelist</h3>
    <ul>
        <li>Click any QR, JSR script, or LittleWhiteBox button entry to move it to the whitelist. Whitelisted buttons will remain above the chat input bar.</li>
    </ul>

    <h3 id="help-icons">Button Icon</h3>
    <h4>Built-in Icons</h4>
    <ul>
        <li>The default button icon is Star & Crescent. The extension also offers Rocket, Hexagram, Palette, and many other built-in icons.</li>
    </ul>
    <h4>Custom Icons</h4>
    <ul>
        <li>In addition to built-in icons, the extension supports <code>Custom Icons</code>.</li>
        <li>Click <code>Add Icon</code>, then enter a name and image hosting URL to add a custom icon. A free image host link (Catbox) is provided inside the dialog.</li>
        <li>Click <code>Manage Icons</code> to rename or delete your custom icons.</li>
    </ul>
    <h4>Current Character Card</h4>
    <ul>
        <li>The extension also supports using the <code>Current Character Card</code> avatar as the button icon. It updates automatically when switching chats.</li>
    </ul>
    <h4>Other Notes</h4>
    <p>If the SillyTavern theme you are using comes with its own QR Assistant icon, that theme icon will override your current selection. This is expected behavior.</p>
    <p>The QR Assistant icon has the ID <code>quick-reply-rocket-button</code>. Theme designers are more than welcome to replace the QR Assistant icon using this ID!</p>

    <h3 id="help-theme">Menu UI Themes</h3>
    <ul>
        <li>The extension includes multiple built-in UI themes for you to choose from.</li>
    </ul>

    <h3 id="help-sort">Menu Button Custom Sorting</h3>
    <ul>
        <li>The extension supports custom sorting of menu buttons. Click the <code>Settings</code> button in the <code>Button Sorting</code> card on the main settings page to open the sort management dialog.</li>
        <li>When custom sorting is disabled, menu buttons are auto-arranged (default mode).</li>
        <li>When custom sorting is enabled, you can drag buttons to customize their order in the menu.</li>
    </ul>

    <h3 id="help-others">Other Features</h3>
    <h4>Enable/Disable QR Assistant</h4>
    <ul><li>Use the <code>Enable/Disable extension</code> dropdown.</li></ul>
    <h4>Auto-Hide Input Bar Buttons</h4>
    <ul><li>Enable the <code>Auto-Collapse Buttons</code> feature.</li></ul>
    <h4>Background Blur Effect</h4>
    <ul><li>Enable the <code>Background Blur</code> feature.</li></ul>
    <h4>Merge Quick Replies</h4>
    <ul><li>Enabling the Merge Quick Replies feature makes all buttons kept above the input bar stick together in a single row, rather than each script/QR button displaying on its own separate line. This is the same feature as the "Merge Quick Replies" setting in Quick Reply v2, and the two stay in sync.</li></ul>

    <h3 id="help-thirdparty-api">Third-Party Plugin Button Registration API</h3>
    <p>QR Assistant allows third-party SillyTavern extensions to register custom buttons into the QR Assistant system via <code>window.qrAssistantExtensionApi</code> (so QR Assistant can directly capture and manage extension buttons).</p>
    <p>Example — register a custom button from your extension:</p>
    <pre><code>// Ensure the array exists before pushing
if (!window.qrAssistantExtensionApi) {
    window.qrAssistantExtensionApi = [];
}

// Register your custom button
window.qrAssistantExtensionApi.push({
    dom_id: 'my-extension-custom-btn',       // (Required) The id of the DOM element to capture
    group_name: 'My Extension Name',          // (Optional) Display name shown in the menu header
    button_name: 'My Button Label'            // (Optional) Button label text; if omitted, falls back to
                                              //            the element's title or textContent
});</code></pre>
    <p><code>dom_id</code> — the <code>id</code> attribute of the DOM element you want QR Assistant to capture and move into its menu.</p>
    <p><code>group_name</code> — the group header displayed above the button in the menu. If omitted, defaults to a generic label.</p>
    <p><code>button_name</code> — the text or FontAwesome icon class displayed on the button. Supports plain text labels or FontAwesome classes like <code>fa-solid fa-star</code>.</p>
    <p>QR Assistant reads this registry every time it rebuilds the menu.</p>
    <p>If you still don't understand, you can send this section directly to an AI for help!</p>

    <h3 id="help-compat">Input Helper & Preset Transfer extension</h3>
    <ul>
        <li>Add Input Helper (Script Version) to the whitelist to keep its symbol buttons visible.</li>
        <li>Compatible with the <code>Preset Transfer Tool</code> extension — its "World Book Common" button will appear on the left side of the list.</li>
    </ul>

    <h3 id="help-update">Update Check</h3>
    <ul>
        <li>In addition to SillyTavern's built-in update check on the Extensions management page, the extension also checks for new versions automatically every 24 hours. When a new version is available, a <code>NEW</code> badge will appear, and the <code>Check for Updates</code> button will turn red with the text <code>New Version Found</code>. Click it to view the changelog and quickly update the extension.</li>
        <li>If the update fails, you can manually update QR Assistant from the Extensions management page. If it still fails, try deleting and reinstalling the extension to use the latest version.</li>
    </ul>
    <div style="height: 100px;"></div>
`,

    'zh-tw': `
    <h2 id="help-video">影片範例</h2>
    <div class="qr-help-video-container">
        <video controls controlsList="nodownload" preload="metadata">
            <source src="https://files.catbox.moe/mu8kg5.mp4" type="video/mp4">
            您的瀏覽器不支援影片標籤。
        </video>
    </div>

    <h2 id="help-core">核心功能</h2>
    <ul>
        <li>能夠將聊天輸入框上方的按鈕都移動到一個獨立的選單中，並透過傳送按鈕左邊的圖示來開啟該選單。</li>
    </ul>
    <blockquote>
        擴充提供<code>白名單</code>功能，在<code>白名單</code>中的按鈕將不會放到該選單中。因此，你可以選擇性地保留一些按鈕到輸入框上方（例如輸入助手）。
    </blockquote>

    <h2 id="help-detail">具體功能介紹</h2>

    <h3 id="help-whitelist">白名單功能</h3>
    <ul>
        <li>點選對應的QR、酒館指令碼、小白X按鈕，即可移至白名單列表，白名單列表的按鈕將會保留在輸入框上方。</li>
    </ul>

    <h3 id="help-icons">按鈕圖示</h3>
    <h4>內建圖示</h4>
    <ul>
        <li>預設按鈕圖示是星月，不過擴充還內建了小火箭、六芒星、調色盤等圖示可供選擇。</li>
    </ul>
    <h4>自訂圖示</h4>
    <ul>
        <li>除了以上內建的圖示外，擴充還支援<code>自訂圖示</code>。</li>
        <li>點選<code>新增圖示</code>按鈕，然後輸入自訂的圖示名稱和圖片的圖床連結，即可新增自訂的圖示。另外，彈窗內部提供免費圖床連結（catbox）。</li>
        <li>點選<code>管理圖示</code>按鈕，即可修改自訂圖示的名稱或者刪除對應的自訂圖示。</li>
    </ul>
    <h4>目前角色卡</h4>
    <ul>
        <li>擴充還支援使用<code>目前角色卡</code>的頭像作為按鈕圖示，切換聊天時會自動更新為對應角色的頭像。</li>
    </ul>
    <h4>其他說明</h4>
    <p>如果酒館主題UI自帶QR助手圖示，那麼該主題的圖示是會覆蓋掉你目前使用的QR助手按鈕圖示的。這是預期現象。</p>
    <p>QR助手圖示的ID是<code>quick-reply-rocket-button</code>，非常歡迎各位美化老師進行替換QR助手圖示！</p>

    <h3 id="help-theme">選單UI主題</h3>
    <ul>
        <li>擴充內建多種UI主題，可供選擇。</li>
    </ul>

    <h3 id="help-sort">選單按鈕自訂排序</h3>
    <ul>
        <li>擴充支援自訂選單按鈕的排序。在主設定頁面點選<code>選單按鈕排序</code>卡片中的<code>設定</code>按鈕，即可開啟排序管理彈窗。</li>
        <li>關閉自訂排序時，選單按鈕將自動排列（預設模式）。</li>
        <li>開啟自訂排序後，可以透過拖曳按鈕來自訂選單中的按鈕順序。</li>
    </ul>

    <h3 id="help-others">其他功能</h3>
    <h4>一鍵停用/啟用QR助手</h4>
    <ul><li>選擇<code>啟用/停用擴充</code>即可</li></ul>
    <h4>內建自動折疊輸入框區域</h4>
    <ul><li>啟用<code>按鈕自動折疊</code>功能即可。</li></ul>
    <h4>提供按鈕選單背景模糊效果</h4>
    <ul><li>啟用<code>背景模糊效果</code>功能即可。</li></ul>
    <h4>合併快速回覆</h4>
    <ul><li>啟用合併快速回覆功能，會將所有保留在輸入框上方的按鈕都使其緊貼在一塊，而不是每個腳本/QR的按鈕都單獨顯示為一行。該功能與酒館中快速回覆的"合併快速回覆"是一個功能，並且會同步更新。</li></ul>

    <h3 id="help-thirdparty-api">第三方外掛按鈕註冊 API</h3>
    <p>QR 助手允許第三方酒館外掛透過 <code>window.qrAssistantExtensionApi</code> 將自訂按鈕註冊到 QR 助手系統中（讓QR助手可以直接獲取外掛按鈕並進行管理）。</p>
    <p>範例 — 從你的外掛註冊一個自訂按鈕：</p>
    <pre><code>// 確保陣列存在後再 push
if (!window.qrAssistantExtensionApi) {
    window.qrAssistantExtensionApi = [];
}

// 註冊你的自訂按鈕
window.qrAssistantExtensionApi.push({
    dom_id: 'my-extension-custom-btn',       // (必填) 要捕獲的 DOM 元素的 id
    group_name: '我的外掛名稱',                // (選填) 選單中顯示的分組名稱
    button_name: '我的按鈕文字'                // (選填) 按鈕顯示文字；若省略，
                                              //         則自動使用元素的 title 或 textContent
});</code></pre>
    <p><code>dom_id</code> — 你希望 QR 助手捕獲並移入選單的 DOM 元素的 <code>id</code> 屬性。</p>
    <p><code>group_name</code> — 選單中按鈕上方顯示的分組標題。若省略，將使用預設標籤。</p>
    <p><code>button_name</code> — 按鈕上顯示的文字或 FontAwesome 圖示類別。支援純文字標籤或 FontAwesome 類別，如 <code>fa-solid fa-star</code>。</p>
    <p>QR 助手每次重建選單時都會讀取此註冊表。</p>
    <p>如果仍然不理解，可以直接將該段說明發送給AI！</p>

    <h3 id="help-compat">輸入助手與預設轉移擴充</h3>
    <ul>
        <li>將輸入助手（指令碼版）移至白名單即可正常顯示對應的符號按鈕。</li>
        <li>已經相容<code>預設轉移工具</code>擴充的「世界書常用」按鈕，會顯示在列表左側。</li>
    </ul>

    <h3 id="help-update">檢測更新</h3>
    <ul>
        <li>除了酒館內建的在<code>管理擴充程式</code>頁面提供的檢測更新外，擴充也提供自動檢測版本更新。每超過24小時會檢測一次版本。如果存在最新版本，則會顯示<code>NEW</code>符號，並且<code>檢測版本</code>會變為紅色的<code>發現新版本</code>標題。點選<code>發現新版本</code>可檢視更新日誌，並快速進行更新擴充。</li>
        <li>如果更新失敗，可以在酒館擴充頁面的<code>管理擴充程式</code>列表中手動更新QR助手。如果依然更新失敗，則可以嘗試刪除重裝來使用最新版本擴充。</li>
    </ul>
    <div style="height: 100px;"></div>
`,

    'zh-cn': `
    <h2 id="help-video">视频示例</h2>
    <div class="qr-help-video-container">
        <video controls controlsList="nodownload" preload="metadata">
            <source src="https://files.catbox.moe/mu8kg5.mp4" type="video/mp4">
            您的浏览器不支持视频标签。
        </video>
    </div>

    <h2 id="help-core">核心功能</h2>
    <ul>
        <li>能够将聊天输入框上方的按钮都移动到一个独立的菜单中，并通过发送按钮左边图标用来打开该菜单。</li>
    </ul>
    <blockquote>
        插件提供<code>白名单</code>功能，在<code>白名单</code>中的按钮将不会放到该菜单中。因此，你可以选择性的保留一些按钮到输入框上方（例如输入助手）。
    </blockquote>

    <h2 id="help-detail">具体功能介绍</h2>

    <h3 id="help-whitelist">白名单功能</h3>
    <ul>
        <li>点击对应的QR、酒馆脚本、小白X按钮，即可移至白名单列表，白名单列表的按钮将会保留在输入框上方。</li>
    </ul>

    <h3 id="help-icons">按钮图标</h3>
    <h4>内置图标</h4>
    <ul>
        <li>默认按钮图标是星月，不过插件还内置了小火箭、六芒星、调色盘等图标可供选择。</li>
    </ul>
    <h4>自动图标</h4>
    <ul>
        <li>除了以上内置的四个图标外，插件还支持<code>自定义图标</code>。</li>
        <li>点击<code>新增图标</code>按钮，然后输入自定义的图标名称和图片的图床链接，即可添加自定义的图标。另外，弹窗内部提供免费图床链接（catbox）。</li>
        <li>点击<code>管理图标</code>按钮，即可修改自定义图标的名称或者删除对应的自定义图标。</li>
    </ul>
    <h4>当前角色卡</h4>
    <ul>
        <li>插件还支持使用<code>当前角色卡</code>的头像作为按钮图标，切换聊天时会自动更新为对应角色的头像。</li>
    </ul>
    <h4>其他说明</h4>
    <p>如果酒馆主题UI自带QR助手图标，那么该主题的图标是会覆盖掉你当前使用的QR助手按钮图标的。这是预期现象。</p>
    <p>QR助手图标的ID是<code>quick-reply-rocket-button</code>，非常欢迎各位美化老师进行替换QR助手图标！</p>

    <h3 id="help-theme">菜单UI主题</h3>
    <ul>
        <li>插件内置多种UI主题，可供选择。</li>
    </ul>

    <h3 id="help-sort">菜单按钮自定义排序</h3>
    <ul>
        <li>插件支持自定义菜单按钮的排序。在主设置页面点击<code>菜单按钮排序</code>卡片中的<code>设置</code>按钮，即可打开排序管理弹窗。</li>
        <li>关闭自定义排序时，菜单按钮将自动排列（默认模式）。</li>
        <li>开启自定义排序后，可以通过拖拽按钮来自定义菜单中的按钮顺序。</li>
    </ul>

    <h3 id="help-others">其他功能</h3>
    <h4>一键禁用/启用QR助手</h4>
    <ul><li>选择<code>启用/禁用插件</code>即可</li></ul>
    <h4>内置自动折叠输入框区域</h4>
    <ul><li>启用<code>按钮自动折叠</code>功能即可。</li></ul>
    <h4>提供按钮菜单背景模糊效果</h4>
    <ul><li>启用<code>背景模糊效果</code>功能即可。</li></ul>
    <h4>合并快速回复</h4>
    <ul><li>启用合并快速回复功能，会将所有保留在输入框上方的按钮都使其紧贴在一块，而不是每个脚本/QR的按钮都单独显示为一行。该功能与酒馆中快速回复的"合并快速回复"是一个功能，并且会同步更新。</li></ul>

    <h3 id="help-thirdparty-api">第三方插件按钮注册 API</h3>
    <p>QR 助手允许第三方酒馆插件通过 <code>window.qrAssistantExtensionApi</code> 将自定义按钮注册到 QR 助手系统中（让QR助手可以直接获取插件按钮并进行管理）。</p>
    <p>示例 — 从你的插件注册一个自定义按钮：</p>
    <pre><code>// 确保数组存在后再 push
if (!window.qrAssistantExtensionApi) {
    window.qrAssistantExtensionApi = [];
}

// 注册你的自定义按钮
window.qrAssistantExtensionApi.push({
    dom_id: 'my-extension-custom-btn',       // (必填) 要捕获的 DOM 元素的 id
    group_name: '我的插件名称',                // (选填) 菜单中显示的分组名称
    button_name: '我的按钮文字'                // (选填) 按钮显示文字；若省略，
                                              //         则自动使用元素的 title 或 textContent
});</code></pre>
    <p><code>dom_id</code> — 你希望 QR 助手捕获并移入菜单的 DOM 元素的 <code>id</code> 属性。</p>
    <p><code>group_name</code> — 菜单中按钮上方显示的分组标题。若省略，将使用默认标签。</p>
    <p><code>button_name</code> — 按钮上显示的文字或 FontAwesome 图标类。支持纯文字标签或 FontAwesome 类，如 <code>fa-solid fa-star</code>。</p>
    <p>QR 助手每次重建菜单时都会读取此注册表。</p>
    <p>如果仍然不理解，可以直接将该段说明发送给哈基米或deepseek等AI！</p>

    <h3 id="help-compat">输入助手与预设转移插件</h3>
    <ul>
        <li>将输入助手（脚本版）移至白名单即可正常显示对应的符号按钮。</li>
        <li>已经兼容<code>预设转移工具</code>插件的"世界书常用"按钮，会显示在列表左侧。</li>
    </ul>

    <h3 id="help-update">检测更新</h3>
    <ul>
        <li>除了酒馆内置的在<code>管理扩展程序</code>页面提供的检测更新外，插件也提供自动检测版本更新。每超过24小时会检测一次版本。如果存在最新版本，则会显示<code>NEW</code>符号，并且<code>检测版本</code>会变为红色的<code>发现新版本</code>标题。点击<code>发现新版本</code>可查看更新日志，并快速进行更新插件。</li>
        <li>如果更新失败，可以在酒馆扩展页面的<code>管理扩展程序</code>列表中手动更新QR助手。如果依然更新失败，则可以尝试删除重装来使用最新版本插件。</li>
    </ul>
    <div style="height: 100px;"></div>
`
};

// === 更新公告多语言块 ===
export const announcementDocs = {
    'en': `
    <h3 style="text-align: center; margin-top: 0;">QR Assistant (2026/4/29)</h3>
    <h4 style="margin-top: 15px; margin-bottom: 5px;">Major Updates & Optimizations</h4>
    <ul style="padding-left: 20px; margin-top: 0;">
        <li>You can now customize the sorting of buttons in the menu panel. Open "Button Sorting" in the QR Assistant settings page, enable the feature, and drag to sort.</li>
        <li>Reduced the opening speed of the QR menu panel (reduced latency).</li>
        <li>Added Traditional Chinese / English support.</li>
        <li>Supported setting the current character card image as the button icon, and provided an image rotation feature (disabled by default).</li>
    </ul>
    <h4 style="margin-top: 15px; margin-bottom: 5px;">Others</h4>
    <ul style="padding-left: 20px; margin-top: 0;">
        <li>QR Assistant allows specific QR/script buttons to remain above the chat input box. Just put the corresponding buttons into the "Whitelist".</li>
        <li>Finally, detailed information and the manual of the extension can be found in the "Usage Guide" on the settings page.</li>
    </ul>
    `,

    'zh-tw': `
    <h3 style="text-align: center; margin-top: 0;">QR助手（2026/4/29）</h3>
    <h4 style="margin-top: 15px; margin-bottom: 5px;">主要更新優化</h4>
    <ul style="padding-left: 20px; margin-top: 0;">
        <li>現在支援將選單面板中的按鈕進行自訂排序了，在QR助手的擴充設定頁面打開「選單按鈕排序」並開啟該功能，並進行自訂排序即可。</li>
        <li>減少QR選單面板的打開速度（減少延遲）</li>
        <li>提供繁體中文/英文支援</li>
        <li>支援將目前角色卡圖片設定成按鈕圖示，並提供圖片旋轉功能（預設關閉）</li>
    </ul>
    <h4 style="margin-top: 15px; margin-bottom: 5px;">其他</h4>
    <ul style="padding-left: 20px; margin-top: 0;">
        <li>QR助手允許將指定的QR/腳本按鈕保留到聊天輸入框上方，只需要將對應的按鈕放入到「白名單」列表中即可。</li>
        <li>最後，關於擴充的詳細資訊和說明頁可以在擴充頁面的「使用說明」中查看。</li>
    </ul>
    `,

    'zh-cn': `
    <h3 style="text-align: center; margin-top: 0;">QR助手（2026/4/29）</h3>
    <h4 style="margin-top: 15px; margin-bottom: 5px;">主要更新优化</h4>
    <ul style="padding-left: 20px; margin-top: 0;">
        <li>现在支持将菜单面板中的按钮进行自定义排序了，在QR助手的插件设置页面打开"菜单按钮排序"并开启该功能，并进行自定义排序即可。</li>
        <li>减少QR菜单面板的打开速度（减少延迟）</li>
        <li>提供繁体中文/英文支持</li>
        <li>支持将当前角色卡图片设置成按钮图标，并提供图片旋转功能（默认关闭）</li>
    </ul>
    <h4 style="margin-top: 15px; margin-bottom: 5px;">其他</h4>
    <ul style="padding-left: 20px; margin-top: 0;">
        <li>QR助手允许将指定的QR/脚本按钮保留到聊天输入框上方，只需要将对应的按钮放入到"白名单"列表中即可。</li>
        <li>最后，关于插件的详细信息和说明页可以在插件页面的"使用说明"中查看。</li>
    </ul>
    `
};
