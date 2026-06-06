import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { success, error, paginated } from '../utils/response';
import { createNotification } from '../services/notification.service';
import { aiModerate } from '../services/moderation.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// 确保 dating profile 存在
async function ensureProfile(userId: number) {
  let profile = await prisma.datingProfile.findUnique({ where: { userId } });
  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    profile = await prisma.datingProfile.create({
      data: {
        userId,
        nickname: user?.nickname || `匿名用户${userId}`,
        avatarSeed: crypto.randomBytes(4).toString('hex'),
      },
    });
  }
  return profile;
}

/** GET /api/dating/profile */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!profile) return success(res, null, '尚未创建');
    return success(res, profile);
  } catch (err) { next(err); }
}

/** POST /api/dating/profile */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { nickname, gender, bio, customAvatar, contactWechat, contactQq } = req.body;
    const data: any = {};
    if (nickname !== undefined) data.nickname = nickname;
    if (gender !== undefined) data.gender = gender;
    if (bio !== undefined) data.bio = bio;
    if (customAvatar !== undefined) data.customAvatar = customAvatar;
    if (contactWechat !== undefined) data.contactWechat = contactWechat;
    if (contactQq !== undefined) data.contactQq = contactQq;

    const existing = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    let profile;
    if (existing) {
      profile = await prisma.datingProfile.update({ where: { userId: req.user!.userId }, data });
    } else {
      data.userId = req.user!.userId;
      data.nickname = data.nickname || `匿名用户${req.user!.userId}`;
      data.avatarSeed = crypto.randomBytes(4).toString('hex');
      profile = await prisma.datingProfile.create({ data });
    }
    return success(res, profile);
  } catch (err) { next(err); }
}

/** GET /api/dating/posts */
export async function getPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = 20;
    const [list, total] = await Promise.all([
      prisma.datingPost.findMany({
        include: { author: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true } } },
        skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
      }),
      prisma.datingPost.count(),
    ]);

    // 获取所有作者的恋爱关系状态
    const profileIds = [...new Set(list.map(p => p.author.id))];
    const relationships = await prisma.datingRequest.findMany({
      where: {
        status: 'accepted',
        OR: profileIds.flatMap(pid => [
          { senderId: pid },
          { receiverId: pid },
        ]),
      },
      select: { senderId: true, receiverId: true },
    });
    const inRelationship = new Set<number>();
    for (const r of relationships) {
      inRelationship.add(r.senderId);
      inRelationship.add(r.receiverId);
    }

    const data = list.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      authorInRelationship: inRelationship.has(p.author.id),
    }));
    return paginated(res, data, total, page, pageSize);
  } catch (err) { next(err); }
}

/** POST /api/dating/posts */
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, images } = req.body;
    if (!content?.trim()) return error(res, '请输入内容');
    const profile = await ensureProfile(req.user!.userId);
    const post = await prisma.datingPost.create({
      data: { userId: profile.id, content: content.trim(), images: JSON.stringify(images || []) },
    });
    // L2 AI 异步审核（必须在 return 之前）
    aiModerate(content, { contentType: 'dating_post', userId: req.user!.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged dating post #${post.id}, deleting`);
        prisma.datingPost.delete({ where: { id: post.id } }).catch(() => {});
      }
    });

    return success(res, { ...post, images: JSON.parse(post.images || '[]') }, '发布成功', 201);
  } catch (err) { next(err); }
}

/** POST /api/dating/:userId/follow */
export async function followUser(req: Request, res: Response, next: NextFunction) {
  try {
    const followerProfile = await ensureProfile(req.user!.userId);
    const targetUserId = parseInt(req.params.userId as string);
    if (isNaN(targetUserId)) return error(res, '无效的用户ID');

    const followingProfile = await prisma.datingProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (!followingProfile) return error(res, '对方未创建恋爱资料', 404);
    if (followerProfile.id === followingProfile.id) return error(res, '不能关注自己');
    await prisma.datingFollow.upsert({
      where: { followerId_followingId: { followerId: followerProfile.id, followingId: followingProfile.id } },
      create: { followerId: followerProfile.id, followingId: followingProfile.id },
      update: {},
    });
    return success(res, null, '关注成功');
  } catch (err) { next(err); }
}

/** POST /api/dating/:userId/request — 发起恋爱请求 */
export async function sendRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const senderProfile = await ensureProfile(req.user!.userId);
    const targetUserId = parseInt(req.params.userId as string);
    if (isNaN(targetUserId)) return error(res, '无效的用户ID');
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!targetUser) return error(res, '用户不存在', 404);
    if (targetUser.id === req.user!.userId) return error(res, '不能给自己发请求');

    const receiverProfile = await prisma.datingProfile.findUnique({
      where: { userId: targetUser.id },
    });
    if (!receiverProfile) return error(res, '对方未创建恋爱资料', 404);

    // 检查是否已关注对方
    const isFollowing = await prisma.datingFollow.findUnique({
      where: { followerId_followingId: { followerId: senderProfile.id, followingId: receiverProfile.id } },
    });
    if (!isFollowing) return error(res, '请先关注对方');

    // 检查发起方是否已有恋爱对象
    const existingRelationship = await prisma.datingRequest.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: senderProfile.id },
          { receiverId: senderProfile.id },
        ],
      },
    });
    if (existingRelationship) return error(res, '你已有恋爱对象，无法发起新请求');

    // 检查对方是否已有恋爱对象
    const receiverRelationship = await prisma.datingRequest.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: receiverProfile.id },
          { receiverId: receiverProfile.id },
        ],
      },
    });
    if (receiverRelationship) return error(res, '对方已有恋爱对象');

    // 检查是否有已有请求
    const existing = await prisma.datingRequest.findUnique({
      where: { senderId_receiverId: { senderId: senderProfile.id, receiverId: receiverProfile.id } },
    });
    if (existing) {
      if (existing.status === 'pending') return error(res, '已有待处理的恋爱请求');
      if (existing.status === 'rejected') return error(res, '对方已拒绝，无法再次发起');
    }

    const request = await prisma.datingRequest.create({
      data: { senderId: senderProfile.id, receiverId: receiverProfile.id },
    });

    // 通知接收方
    createNotification({
      userId: targetUser.id,
      type: 'dating_request',
      title: '新的恋爱请求',
      content: `${senderProfile.nickname} 向你发起了恋爱请求`,
      relatedId: request.id,
    }).catch(() => {});

    return success(res, request, '恋爱请求已发送', 201);
  } catch (err) { next(err); }
}

/** PATCH /api/dating/requests/:requestId — 接受/拒绝恋爱请求 */
export async function handleRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = parseInt(req.params.requestId as string);
    if (isNaN(requestId)) return error(res, '无效的请求ID');
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return error(res, '无效的状态值');

    const request = await prisma.datingRequest.findUnique({ where: { id: requestId } });
    if (!request) return error(res, '请求不存在', 404);

    const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!myProfile || request.receiverId !== myProfile.id) return error(res, '无权操作', 403);
    if (request.status !== 'pending') return error(res, '该请求已处理');

    // 检查接收方是否已有恋爱对象
    if (status === 'accepted') {
      const myRelationship = await prisma.datingRequest.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { senderId: myProfile.id },
            { receiverId: myProfile.id },
          ],
        },
      });
      if (myRelationship) return error(res, '你已有恋爱对象，无法接受新请求');
    }

    const updated = await prisma.datingRequest.update({
      where: { id: requestId },
      data: { status },
    });

    // 通知发起方
    const senderProfile = await prisma.datingProfile.findUnique({ where: { id: request.senderId } });
    if (senderProfile) {
      const isAccepted = status === 'accepted';
      createNotification({
        userId: senderProfile.userId,
        type: 'dating_request',
        title: isAccepted ? '恋爱请求已接受' : '恋爱请求已拒绝',
        content: isAccepted
          ? '对方已接受你的恋爱请求，现在可以查看联系方式了'
          : '对方拒绝了你的恋爱请求',
        relatedId: requestId,
      }).catch(() => {});
    }

    return success(res, updated, status === 'accepted' ? '已接受，双方可查看联系方式' : '已拒绝');
  } catch (err) { next(err); }
}

/** GET /api/dating/requests — 查看我的恋爱请求列表 */
export async function getRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!myProfile) return error(res, '请先创建恋爱资料');

    const [received, sent] = await Promise.all([
      prisma.datingRequest.findMany({
        where: { receiverId: myProfile.id },
        include: { sender: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true, gender: true, contactWechat: true, contactQq: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.datingRequest.findMany({
        where: { senderId: myProfile.id },
        include: { receiver: { select: { id: true, userId: true, nickname: true, avatarSeed: true, customAvatar: true, gender: true, contactWechat: true, contactQq: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return success(res, {
      received: received.map(r => ({
        ...r,
        sender: {
          ...r.sender,
          contactWechat: r.status === 'accepted' ? r.sender.contactWechat : '',
          contactQq: r.status === 'accepted' ? r.sender.contactQq : '',
        },
      })),
      sent: sent.map(r => ({
        ...r,
        receiver: {
          ...r.receiver,
          contactWechat: r.status === 'accepted' ? r.receiver.contactWechat : '',
          contactQq: r.status === 'accepted' ? r.receiver.contactQq : '',
        },
      })),
    });
  } catch (err) { next(err); }
}

/** DELETE /api/dating/relationship/:userId — 断开恋爱关系 */
export async function breakRelationship(req: Request, res: Response, next: NextFunction) {
  try {
    const myProfile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!myProfile) return error(res, '请先创建恋爱资料');

    const peerUserId = parseInt(req.params.userId as string);
    if (isNaN(peerUserId)) return error(res, '无效的用户ID');
    const peerProfile = await prisma.datingProfile.findUnique({
      where: { userId: peerUserId },
    });
    if (!peerProfile) return error(res, '对方未创建恋爱资料', 404);

    // 删除双方之间的 accepted 请求
    await prisma.datingRequest.deleteMany({
      where: {
        status: 'accepted',
        OR: [
          { senderId: myProfile.id, receiverId: peerProfile.id },
          { senderId: peerProfile.id, receiverId: myProfile.id },
        ],
      },
    });

    return success(res, null, '已断开恋爱关系');
  } catch (err) { next(err); }
}

/** DELETE /api/dating/:userId/follow — 取消关注 */
export async function unfollowUser(req: Request, res: Response, next: NextFunction) {
  try {
    const targetUserId = parseInt(req.params.userId as string);
    if (isNaN(targetUserId)) return error(res, '无效的用户ID');
    const followerProfile = await ensureProfile(req.user!.userId);
    const followingProfile = await ensureProfile(targetUserId);
    await prisma.datingFollow.deleteMany({
      where: { followerId: followerProfile.id, followingId: followingProfile.id },
    });
    return success(res, null, '已取消关注');
  } catch (err) { next(err); }
}

/** GET /api/dating/following — 获取我关注的人的 userId 列表 */
export async function getFollowing(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!profile) return success(res, []);
    const follows = await prisma.datingFollow.findMany({
      where: { followerId: profile.id },
      include: { following: { select: { userId: true, nickname: true, avatarSeed: true, customAvatar: true } } },
    });
    return success(res, follows.map(f => ({
      userId: f.following.userId,
      nickname: f.following.nickname,
      avatarSeed: f.following.avatarSeed,
      customAvatar: f.following.customAvatar,
    })));
  } catch (err) { next(err); }
}

/** PUT /api/dating/posts/:postId — 编辑恋爱帖子 */
export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.postId as string);
    if (isNaN(postId)) return error(res, '无效的帖子ID');
    const post = await prisma.datingPost.findUnique({ where: { id: postId } });
    if (!post) return error(res, '帖子不存在', 404);

    const profile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!profile || post.userId !== profile.id) return error(res, '无权操作', 403);

    const { content } = req.body;
    if (!content?.trim()) return error(res, '请输入内容');

    const updated = await prisma.datingPost.update({
      where: { id: postId },
      data: { content: content.trim() },
    });

    // L2 AI 异步审核编辑后的内容
    aiModerate(content, { contentType: 'dating_post', userId: req.user!.userId }).then(result => {
      if (result === 'violation') {
        logger.warn(`AI flagged edited dating post #${postId}, deleting`);
        prisma.datingPost.delete({ where: { id: postId } }).catch(() => {});
      }
    });

    return success(res, updated, '修改成功');
  } catch (err) { next(err); }
}

/** DELETE /api/dating/posts/:postId — 删除恋爱帖子 */
export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = parseInt(req.params.postId as string);
    if (isNaN(postId)) return error(res, '无效的帖子ID');
    const post = await prisma.datingPost.findUnique({ where: { id: postId } });
    if (!post) return error(res, '帖子不存在', 404);

    const profile = await prisma.datingProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!profile || post.userId !== profile.id) return error(res, '无权操作', 403);

    await prisma.datingPost.delete({ where: { id: postId } });
    return success(res, null, '已删除');
  } catch (err) { next(err); }
}
