import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement, AnnouncementPosition } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
  ) {}

  /** 仅管理员：查看全部（含草稿、未到发布时间的） */
  async findAllForAdmin(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      order: { isPinned: 'DESC', publishAt: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 对玩家可见的公告：
   * 1. isActive 为真
   * 2. publishAt 已到（为空视为立即发布）
   * 3. 未到 endAt
   * 4. 指定了展示位置时，positions 需包含该位置；不传则不过滤（用于公告历史页展示全部）
   */
  private applyPublicConditions(qb: ReturnType<Repository<Announcement>['createQueryBuilder']>, now: Date, position?: AnnouncementPosition) {
    qb.where('announcement.isActive = :isActive', { isActive: true })
      .andWhere('(announcement.publishAt IS NULL OR announcement.publishAt <= :now)', { now })
      .andWhere('(announcement.endAt IS NULL OR announcement.endAt >= :now)', { now });
    if (position) {
      // positions 为逗号分隔字符串，使用 FIND_IN_SET 匹配
      qb.andWhere('FIND_IN_SET(:position, announcement.positions)', { position });
    }
    return qb;
  }

  async findPublic(position?: AnnouncementPosition): Promise<Announcement[]> {
    const now = new Date();
    return this.applyPublicConditions(
      this.announcementRepository.createQueryBuilder('announcement'),
      now,
      position,
    )
      .orderBy('announcement.isPinned', 'DESC')
      .addOrderBy('COALESCE(announcement.publishAt, announcement.createdAt)', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({ where: { id } });
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }
    return announcement;
  }

  async create(dto: CreateAnnouncementDto): Promise<Announcement> {
    const { positions, ...rest } = dto;
    const announcement = this.announcementRepository.create({
      ...rest,
      positions: (positions ?? [AnnouncementPosition.HOME]).join(','),
    });
    return this.announcementRepository.save(announcement);
  }

  async update(id: number, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const announcement = await this.findOne(id);
    const { positions, ...rest } = dto;
    Object.assign(announcement, rest);
    if (Array.isArray(positions)) {
      announcement.positions = positions.join(',');
    }
    return this.announcementRepository.save(announcement);
  }

  async remove(id: number): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementRepository.remove(announcement);
  }

  async getLatest(limit: number = 3, position: AnnouncementPosition = AnnouncementPosition.HOME): Promise<Announcement[]> {
    const now = new Date();
    return this.applyPublicConditions(
      this.announcementRepository.createQueryBuilder('announcement'),
      now,
      position,
    )
      .orderBy('announcement.isPinned', 'DESC')
      .addOrderBy('COALESCE(announcement.publishAt, announcement.createdAt)', 'DESC')
      .take(limit)
      .getMany();
  }
}
