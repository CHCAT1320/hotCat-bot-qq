import { NCWebsocket, NCWebsocketOptions } from 'node-napcat-ts';
import { Message } from './message';
import { BotConsole } from './botConsole';
import type { BotClient } from './botClient';

export class BotApi {
    public napcat: NCWebsocket;
    private _client!: BotClient;

    get client(): BotClient { return this._client; }
    set client(c: BotClient) { this._client = c; }

    constructor(config: NCWebsocketOptions, debug?: boolean) {
        this.napcat = new NCWebsocket(config, debug ?? false);
    }

    /** 建立 WebSocket 连接 */
    async connect() {
        await this.napcat.connect();
    }

    /**
     * 获取当前 bot 登录信息
     * @returns `{ user_id: number, nickname: string }`
     */
    async getLoginInfo() {
        return await this.napcat.get_login_info();
    }
    
    /**
     * 发送消息（群聊或私聊）
     * @param target - `{ group_id: number }` 发群聊，`{ user_id: number }` 发私聊
     * @param messages - 消息段
     */
    async sendMessage(target: { group_id: number } | { user_id: number }, ...messages: Message[]) {
        const type = 'group_id' in target ? 'sendGroupMessage' : 'sendPrivateMessage';
        new BotConsole(type, messages).log();
        await this.napcat.send_msg({
            ...target,
            message: messages.map(m => m.toJson()) as any[],
        });
    }

    /**
     * 发送群聊消息
     * @param groupId - 群号
     * @param messages - 消息段
     */
    async sendGroupMessage(groupId: number, ...messages: Message[]) {
        new BotConsole('sendGroupMessage', messages).log();
        await this.napcat.send_group_msg({
            group_id: groupId,
            message: messages.map(m => m.toJson()) as any[],
        });
    }

    /**
     * 发送私聊消息
     * @param userId - QQ 号
     * @param messages - 消息段
     */
    async sendPrivateMessage(userId: number, ...messages: Message[]) {
        new BotConsole('sendPrivateMessage', messages).log();
        await this.napcat.send_private_msg({
            user_id: userId,
            message: messages.map(m => m.toJson()) as any[],
        });
    }

    /**
     * 发送合并转发（通用，自动判断群/私聊）
     * @param target - `{ group_id }` 或 `{ user_id }`
     * @param nodes - 转发节点，由 `Message.node()` / `Message.customNode()` 构建
     */
    async sendForwardMsg(target: { group_id: number } | { user_id: number }, nodes: Message[]) {
        await this.napcat.send_forward_msg({
            ...target,
            message: nodes.map(n => n.toJson()) as any[],
        });
    }

    /**
     * 发送群合并转发
     * @param groupId - 群号
     * @param nodes - 转发节点
     */
    async sendGroupForwardMsg(groupId: number, nodes: Message[]) {
        await this.napcat.send_group_forward_msg({
            group_id: groupId,
            message: nodes.map(n => n.toJson()) as any[],
        });
    }

    /**
     * 发送私聊合并转发
     * @param userId - QQ 号
     * @param nodes - 转发节点
     */
    async sendPrivateForwardMsg(userId: number, nodes: Message[]) {
        await this.napcat.send_private_forward_msg({
            user_id: userId,
            message: nodes.map(n => n.toJson()) as any[],
        });
    }

    /**
     * 转发单条消息到私聊
     * @param userId - 目标 QQ
     * @param messageId - 消息 ID
     */
    async forwardFriendSingleMsg(userId: number, messageId: number) {
        await this.napcat.forward_friend_single_msg({ user_id: userId, message_id: messageId });
    }

    /**
     * 转发单条消息到群聊
     * @param groupId - 群号
     * @param messageId - 消息 ID
     */
    async forwardGroupSingleMsg(groupId: number, messageId: number) {
        await this.napcat.forward_group_single_msg({ group_id: groupId, message_id: messageId });
    }

    /**
     * 撤回消息
     * @param messageId - 消息 ID
     */
    async deleteMessage(messageId: number) {
        await this.napcat.delete_msg({
            message_id: messageId,
        });
    }

    /**
     * 获取单条消息详情
     * @param messageId - 消息 ID
     */
    async getMessage(messageId: number) {
        return await this.napcat.get_msg({
            message_id: messageId,
        });
    }

    /**
     * 获取合并转发消息
     * @param messageId - 消息 ID
     */
    async getForwardMsg(messageId: number) {
        return await this.napcat.get_forward_msg({ message_id: messageId.toString() });
    }

    /**
     * 获取群聊历史消息
     * @param groupId - 群号
     * @param messageSeq - 起始消息序号
     * @param count - 获取数量
     */
    async getGroupMsgHistory(groupId: number, messageSeq?: number, count?: number) {
        return await this.napcat.get_group_msg_history({
            group_id: groupId,
            message_seq: messageSeq,
            count,
        });
    }

    /**
     * 获取私聊消息历史
     * @param userId - QQ 号
     * @param messageSeq - 起始消息序号
     * @param count - 获取数量
     */
    async getFriendMsgHistory(userId: number, messageSeq?: number, count?: number) {
        return await this.napcat.get_friend_msg_history({
            user_id: userId,
            message_seq: messageSeq,
            count,
        });
    }

    /**
     * 标记消息已读
     * @param target - `{ group_id: number }` | `{ user_id: number }` | `{ message_id: number }`
     */
    async markMsgAsRead(target: { group_id: number } | { user_id: number } | { message_id: number }) {
        await this.napcat.mark_msg_as_read(target);
    }

    /** 标记私聊已读 */
    async markPrivateMsgAsRead(userId: number) {
        await this.napcat.mark_private_msg_as_read({ user_id: userId });
    }

    /** 标记群聊已读 */
    async markGroupMsgAsRead(groupId: number) {
        await this.napcat.mark_group_msg_as_read({ group_id: groupId });
    }

    /** 标记所有消息已读 */
    async markAllAsRead() {
        await this.napcat._mark_all_as_read();
    }

    /**
     * 设置消息表情回应
     * @param messageId - 消息 ID
     * @param emojiId - 表情 ID
     * @param set - true 添加 / false 移除
     */
    async setMsgEmojiLike(messageId: number, emojiId: string, set?: boolean) {
        await this.napcat.set_msg_emoji_like({
            message_id: messageId,
            emoji_id: emojiId,
            set,
        });
    }

    /**
     * 拉取表情回应列表
     * @param messageId - 消息 ID
     * @param emojiId - 表情 ID
     */
    async fetchEmojiLike(messageId: number, emojiId?: string) {
        return await this.napcat.fetch_emoji_like({
            message_id: messageId,
            emoji_id: emojiId,
        } as any);
    }

    /** 英译中翻译 */
    async translateEn2zh(words: string[]) {
        return await this.napcat.translate_en2zh({ words });
    }

    /**
     * 群内禁言
     * @param groupId - 群号
     * @param userId - 目标 QQ
     * @param duration - 禁言时长（秒），0 解除
     */
    async banMember(groupId: number, userId: number, duration: number) {
        await this.napcat.set_group_ban({
            group_id: groupId,
            user_id: userId,
            duration,
        });
    }

    /**
     * 踢出群成员
     * @param groupId - 群号
     * @param userId - 目标 QQ
     * @param rejectAdd - 是否拒绝再次加群
     */
    async kickMember(groupId: number, userId: number, rejectAdd?: boolean) {
        await this.napcat.set_group_kick({
            group_id: groupId,
            user_id: userId,
            reject_add_request: rejectAdd,
        });
    }

    /**
     * 全员禁言
     * @param groupId - 群号
     * @param enable - true 开启 / false 关闭，默认 true
     */
    async setGroupWholeBan(groupId: number, enable?: boolean) {
        await this.napcat.set_group_whole_ban({
            group_id: groupId,
            enable,
        });
    }

    /**
     * 设置/取消管理员
     * @param groupId - 群号
     * @param userId - 目标 QQ
     * @param enable - true 设为管理 / false 取消，默认 true
     */
    async setGroupAdmin(groupId: number, userId: number, enable?: boolean) {
        await this.napcat.set_group_admin({
            group_id: groupId,
            user_id: userId,
            enable,
        });
    }

    /**
     * 修改群名片
     * @param groupId - 群号
     * @param userId - 目标 QQ
     * @param card - 新群名片
     */
    async setGroupCard(groupId: number, userId: number, card: string) {
        await this.napcat.set_group_card({
            group_id: groupId,
            user_id: userId,
            card,
        });
    }

    /**
     * 修改群名称
     * @param groupId - 群号
     * @param groupName - 新群名
     */
    async setGroupName(groupId: number, groupName: string) {
        await this.napcat.set_group_name({
            group_id: groupId,
            group_name: groupName,
        });
    }

    /**
     * 设置群备注
     * @param groupId - 群号
     * @param remark - 备注名
     */
    async setGroupRemark(groupId: number, remark: string) {
        await this.napcat.set_group_remark({
            group_id: String(groupId),
            remark,
        });
    }

    /**
     * 设置群头衔
     * @param groupId - 群号
     * @param userId - 目标 QQ
     * @param title - 头衔内容
     */
    async setGroupSpecialTitle(groupId: number, userId: number, title: string) {
        await this.napcat.set_group_special_title({
            group_id: groupId,
            user_id: userId,
            special_title: title,
        });
    }

    /**
     * 退出 / 解散群
     * @param groupId - 群号
     * @param isDismiss - true 解散（群主），默认 false 仅退出
     */
    async leaveGroup(groupId: number, isDismiss?: boolean) {
        await this.napcat.set_group_leave({
            group_id: groupId,
            is_dismiss: isDismiss,
        });
    }

    /**
     * 处理加群申请
     * @param flag - 申请标识（从事件中获取）
     * @param approve - true 同意 / false 拒绝
     * @param reason - 拒绝理由
     */
    async handleGroupAddRequest(flag: string, approve?: boolean, reason?: string) {
        await this.napcat.set_group_add_request({ flag, approve, reason });
    }

    /** 设置群头像，file 支持本地路径/base64/URL */
    async setGroupPortrait(groupId: number, file: string) {
        await this.napcat.set_group_portrait({
            group_id: groupId,
            file,
        });
    }

    /** 群打卡 */
    async sendGroupSign(groupId: number) {
        await this.napcat.set_group_sign({ group_id: groupId });
    }

    /** 发送群公告 */
    async sendGroupNotice(groupId: number, title: string, content: string) {
        await this.napcat._send_group_notice({
            group_id: groupId,
            title,
            content,
        } as any);
    }

    /** 获取群公告 */
    async getGroupNotice(groupId: number) {
        return await this.napcat._get_group_notice({ group_id: groupId });
    }

    /** 删除群公告 */
    async deleteGroupNotice(groupId: number, noticeId: string) {
        await this.napcat._del_group_notice({
            group_id: groupId,
            notice_id: noticeId,
        } as any);
    }

    /**
     * 获取群信息
     * @param groupId - 群号
     */
    async getGroupInfo(groupId: number) {
        return await this.napcat.get_group_info({
            group_id: groupId,
        });
    }

    /** 获取群额外信息 */
    async getGroupInfoEx(groupId: number) {
        return await this.napcat.get_group_info_ex({ group_id: groupId });
    }

    /**
     * 获取群列表
     * @param noCache - true 跳过缓存
     */
    async getGroupList(noCache?: boolean) {
        return await this.napcat.get_group_list(noCache != null ? {
            no_cache: noCache,
        } : undefined);
    }

    /**
     * 获取群成员信息
     * @param groupId - 群号
     * @param userId - QQ 号
     * @param noCache - true 跳过缓存
     */
    async getGroupMemberInfo(groupId: number, userId: number, noCache?: boolean) {
        return await this.napcat.get_group_member_info({
            group_id: groupId,
            user_id: userId,
            no_cache: noCache,
        });
    }

    /**
     * 获取群成员列表
     * @param groupId - 群号
     * @param noCache - true 跳过缓存
     */
    async getGroupMemberList(groupId: number, noCache?: boolean) {
        return await this.napcat.get_group_member_list({
            group_id: groupId,
            no_cache: noCache,
        });
    }

    /**
     * 获取群荣誉信息
     * @param groupId - 群号
     * @param type - 荣誉类型: all/talkative/performer/legend/strong_newbie/emotion
     */
    async getGroupHonorInfo(groupId: number, type?: 'all' | 'talkative' | 'performer' | 'legend' | 'strong_newbie' | 'emotion') {
        return await this.napcat.get_group_honor_info({
            group_id: groupId,
            type,
        });
    }

    /** 获取群系统消息 */
    async getGroupSystemMsg(count?: number) {
        return await this.napcat.get_group_system_msg(count != null ? {
            count,
        } : undefined);
    }

    /** 获取群 @全体成员 剩余次数 */
    async getGroupAtAllRemain(groupId: number) {
        return await this.napcat.get_group_at_all_remain({
            group_id: groupId,
        });
    }

    /** 获取群被禁言用户列表 */
    async getGroupShutList(groupId: number) {
        return await this.napcat.get_group_shut_list({
            group_id: groupId,
        });
    }

    /** 获取群忽略的加群请求 */
    async getGroupIgnoreAddRequest(groupId: number) {
        return await this.napcat.get_group_ignore_add_request({
            group_id: groupId,
        });
    }

    /** 获取精华消息列表 */
    async getEssenceMsgList(groupId: number) {
        return await this.napcat.get_essence_msg_list({
            group_id: groupId,
        });
    }

    /** 设置精华消息 */
    async setEssenceMsg(messageId: number) {
        await this.napcat.set_essence_msg({
            message_id: messageId,
        });
    }

    /** 移出精华消息 */
    async deleteEssenceMsg(messageId: number) {
        await this.napcat.delete_essence_msg({
            message_id: messageId,
        });
    }

    /**
     * 获取陌生人信息
     * @param userId - QQ 号
     */
    async getStrangerInfo(userId: number) {
        return await this.napcat.get_stranger_info({
            user_id: userId,
        });
    }

    /** 获取好友列表 */
    async getFriendList() {
        return await this.napcat.get_friend_list();
    }

    /** 获取好友分类列表 */
    async getFriendsWithCategory() {
        return await this.napcat.get_friends_with_category();
    }

    /**
     * 删除好友
     * @param userId - QQ 号
     * @param tempBlock - 是否拉黑
     * @param tempBothDel - 是否双向删除
     */
    async deleteFriend(userId: number, tempBlock?: boolean, tempBothDel?: boolean) {
        await this.napcat.delete_friend({
            user_id: userId,
            temp_block: tempBlock,
            temp_both_del: tempBothDel,
        });
    }

    /**
     * 处理好友申请
     * @param flag - 申请标识（从事件中获取）
     * @param approve - true 同意 / false 拒绝
     * @param remark - 好友备注
     */
    async handleFriendAddRequest(flag: string, approve?: boolean, remark?: string) {
        await this.napcat.set_friend_add_request({ flag, approve, remark });
    }

    /** 获取用户在线状态 */
    async getUserStatus(userId: number) {
        return await this.napcat.nc_get_user_status({ user_id: userId });
    }

    /** 设置个人签名 */
    async setSelfLongnick(longnick: string) {
        await this.napcat.set_self_longnick({ longNick: longnick });
    }

    /**
     * 群内戳一戳
     * @param groupId - 群号
     * @param userId - 目标 QQ
     */
    async groupPoke(groupId: number, userId: number) {
        await this.napcat.group_poke({
            group_id: groupId,
            user_id: userId,
        });
    }

    /**
     * 好友戳一戳
     * @param userId - 目标 QQ
     */
    async friendPoke(userId: number) {
        await this.napcat.friend_poke({
            user_id: userId,
        });
    }

    /** 发送戳一戳（通用，自动判断群/私聊） */
    async sendPoke(userId: number, groupId?: number) {
        if (groupId != null) {
            await this.napcat.send_poke({ user_id: userId, group_id: groupId } as any);
        } else {
            await this.napcat.send_poke({ user_id: userId } as any);
        }
    }

    /**
     * 点赞
     * @param userId - 目标 QQ
     * @param times - 次数，默认 1
     */
    async sendLike(userId: number, times?: number) {
        await this.napcat.send_like({
            user_id: userId,
            times,
        });
    }

    /**
     * 获取图片文件
     * @param file - 图片 file_id 或 URL
     */
    async getImage(file: string) {
        return await this.napcat.get_image({ file });
    }

    /**
     * 获取语音文件
     * @param file - 语音 file_id 或 URL
     * @param outFormat - 输出格式
     */
    async getRecord(file: string, outFormat?: 'mp3' | 'amr' | 'wma' | 'm4a' | 'spx' | 'ogg' | 'wav' | 'flac') {
        return await this.napcat.get_record({ file, out_format: outFormat });
    }

    /**
     * 上传群文件
     * @param groupId - 群号
     * @param file - 本地文件路径
     * @param name - 显示名称
     * @param folderId - 目标文件夹 ID
     */
    async uploadGroupFile(groupId: number, file: string, name: string, folderId?: string) {
        await this.napcat.upload_group_file({
            group_id: groupId,
            file,
            name,
            folder_id: folderId,
        });
    }

    /**
     * 上传私聊文件
     * @param userId - QQ 号
     * @param file - 本地文件路径
     * @param name - 显示名称
     */
    async uploadPrivateFile(userId: number, file: string, name: string) {
        await this.napcat.upload_private_file({
            user_id: userId,
            file,
            name,
        });
    }

    /**
     * 获取群文件下载链接
     * @param groupId - 群号
     * @param fileId - 文件 ID
     */
    async getGroupFileUrl(groupId: number, fileId: string) {
        return await this.napcat.get_group_file_url({
            group_id: groupId,
            file_id: fileId,
        });
    }

    /**
     * 图片 OCR 识别
     * @param image - 图片 file_id 或 base64
     */
    async ocrImage(image: string) {
        return await this.napcat.ocr_image({ image });
    }

    /** 获取文件信息 */
    async getFile(file: string) {
        return await this.napcat.get_file({ file });
    }

    /** 下载文件到缓存目录 */
    async downloadFile(url: string, name?: string, headers?: string[]) {
        return await this.napcat.download_file({
            url,
            headers,
            name,
        });
    }

    /** 获取收藏表情 */
    async fetchCustomFace(count?: number) {
        return await this.napcat.fetch_custom_face(count != null ? { count } : undefined);
    }

    /** 删除群文件 */
    async deleteGroupFile(groupId: number, fileId: string) {
        await this.napcat.delete_group_file({
            group_id: groupId,
            file_id: fileId,
        });
    }

    /** 创建群文件夹 */
    async createGroupFileFolder(groupId: number, folderName: string) {
        await this.napcat.create_group_file_folder({
            group_id: groupId,
            folder_name: folderName,
        } as any);
    }

    /** 删除群文件夹 */
    async deleteGroupFolder(groupId: number, folderId: string) {
        await this.napcat.delete_group_folder({
            group_id: groupId,
            folder_id: folderId,
        });
    }

    /** 获取群文件系统信息 */
    async getGroupFileSystemInfo(groupId: number) {
        return await this.napcat.get_group_file_system_info({
            group_id: groupId,
        });
    }

    /** 获取群根目录文件列表 */
    async getGroupRootFiles(groupId: number) {
        return await this.napcat.get_group_root_files({
            group_id: groupId,
        });
    }

    /** 获取群子目录文件列表 */
    async getGroupFilesByFolder(groupId: number, folderId: string) {
        return await this.napcat.get_group_files_by_folder({
            group_id: groupId,
            folder_id: folderId,
        });
    }

    /** 获取最近的聊天记录 */
    async getRecentContact() {
        return await this.napcat.get_recent_contact();
    }

    /** 获取自身点赞列表 */
    async getProfileLike() {
        return await this.napcat.get_profile_like();
    }

    /** 创建文本收藏 */
    async createCollection(rawData: string, brief: string) {
        await this.napcat.create_collection({ rawData, brief } as any);
    }

    /** 获取收藏列表 */
    async getCollectionList(category?: number, count?: number) {
        return await this.napcat.get_collection_list({ category, count } as any);
    }

    /** 推荐联系人/群聊 */
    async recommendContact(userId: number, phoneNumber?: string) {
        await this.napcat.ArkSharePeer({ user_id: userId, phoneNumber } as any);
    }

    /** 推荐群聊 */
    async recommendGroup(groupId: number) {
        await this.napcat.ArkShareGroup({ group_id: groupId } as any);
    }

    /** 获取 AI 语音角色列表 */
    async getAiCharacters() {
        return await this.napcat.get_ai_characters({ group_id: 0, chat_type: undefined } as any);
    }

    /** AI 文字转语音 */
    async getAiRecord(characterId: string, text: string) {
        return await this.napcat.get_ai_record({ character_id: characterId, text } as any);
    }

    /** 群聊发送 AI 语音 */
    async sendGroupAiRecord(groupId: number, characterId: string, text: string) {
        await this.napcat.send_group_ai_record({
            group_id: groupId,
            character_id: characterId,
            text,
        } as any);
    }

    /** 签名小程序卡片（如 B 站分享卡片） */
    async getMiniAppArk(app: string, bizSrc: string, meta: any) {
        return await this.napcat.get_mini_app_ark({
            app,
            biz_src: bizSrc,
            meta,
        } as any);
    }

    /** 获取 bot 运行状态 */
    async getStatus() {
        return await this.napcat.get_status();
    }

    /** 获取 napcat 版本信息 */
    async getVersionInfo() {
        return await this.napcat.get_version_info();
    }

    /** 获取 Cookies */
    async getCookies(domain: string) {
        return await this.napcat.get_cookies({ domain });
    }

    /** 获取 CSRF Token */
    async getCsrfToken() {
        return await this.napcat.get_csrf_token();
    }

    /** 获取 QQ 相关接口凭证 (cookies + csrf_token) */
    async getCredentials() {
        return await this.napcat.get_credentials();
    }

    /** 检查是否可以发送图片 */
    async canSendImage() {
        return await this.napcat.can_send_image();
    }

    /** 检查是否可以发送语音 */
    async canSendRecord() {
        return await this.napcat.can_send_record();
    }

    /** 清理缓存 */
    async cleanCache() {
        await this.napcat.clean_cache();
    }

    /** 获取 Rkey */
    async getRkey() {
        return await this.napcat.nc_get_rkey();
    }

    /** 获取 PacketServer 状态 */
    async getPacketStatus() {
        return await this.napcat.nc_get_packet_status();
    }

    /** 获取机器人 QQ 号区间 */
    async getRobotUinRange() {
        return await this.napcat.get_robot_uin_range();
    }

    /** 设置在线状态 */
    async setOnlineStatus(status: number, extStatus?: number, batteryStatus?: number) {
        await this.napcat.set_online_status({
            status,
            ext_status: extStatus,
            battery_status: batteryStatus,
        });
    }

    /** 设置 QQ 资料 */
    async setQQProfile(nickname: string, personalNote?: string, sex?: number) {
        await this.napcat.set_qq_profile({
            nickname,
            personal_note: personalNote,
            sex,
        });
    }

    /** 设置 QQ 头像，file 支持本地路径/base64/URL */
    async setQQAvatar(file: string) {
        await this.napcat.set_qq_avatar({ file });
    }

    /**
     * 设置输入状态（"正在输入…"）
     * @param userId - QQ 号
     * @param eventType - 状态类型（具体值参考 napcat 文档）
     */
    async setInputStatus(userId: number, eventType: number) {
        await this.napcat.set_input_status({
            user_id: String(userId),
            event_type: eventType,
        });
    }

    /** 对事件执行快速操作（隐藏 API） */
    async handleQuickOperation(context: any, operation: any) {
        await (this.napcat as any)['.handle_quick_operation']({ context, operation });
    }
}
