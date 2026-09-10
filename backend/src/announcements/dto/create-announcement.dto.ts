import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsEnum, IsDateString, MaxLength, IsArray, ArrayUnique, ArrayMinSize } from 'class-validator';
import { AnnouncementType, AnnouncementPosition } from '../entities/announcement.entity';

export class CreateAnnouncementDto {
  @ApiProperty({ description: '标题' })
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '正文' })
  @IsNotEmpty({ message: '正文不能为空' })
  @IsString()
  content: string;

  @ApiProperty({ description: '类型', enum: AnnouncementType, required: false })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: '是否置顶', required: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiProperty({ description: '发布时间（ISO 字符串，不传则立即发布）', required: false })
  @IsOptional()
  @IsDateString({}, { message: '发布时间格式不正确' })
  publishAt?: string;

  @ApiProperty({
    description: '展示位置：home=首页公告区, banner=顶部横幅, page=公告历史页',
    enum: AnnouncementPosition,
    isArray: true,
    required: false,
    example: ['home', 'page'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一个展示位置' })
  @ArrayUnique()
  @IsEnum(AnnouncementPosition, { each: true, message: '展示位置不合法' })
  positions?: AnnouncementPosition[];

  @ApiProperty({ description: '下架时间', required: false })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}
