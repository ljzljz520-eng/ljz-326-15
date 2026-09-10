import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AnnouncementType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum AnnouncementPosition {
  /** 首页公告区 */
  HOME = 'home',
  /** 全站顶部横幅轮播 */
  BANNER = 'banner',
  /** 公告历史页 */
  PAGE = 'page',
}

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: AnnouncementType, default: AnnouncementType.INFO })
  type: AnnouncementType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPinned: boolean;

  /** 发布时间（支持定时发布，为空时取创建时间） */
  @Column({ type: 'datetime', nullable: true })
  publishAt: Date | null;

  /** 展示位置，多个位置以逗号分隔，默认只在首页展示 */
  @Column({ length: 100, default: 'home' })
  positions: string;

  @Column({ type: 'datetime', nullable: true })
  endAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
