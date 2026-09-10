import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnnouncementPosition, Announcement } from './entities/announcement.entity';

@ApiTags('公告')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建公告（仅管理员）' })
  create(@Body() createAnnouncementDto: CreateAnnouncementDto) {
    return this.announcementsService.create(createAnnouncementDto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取全部公告含未发布（仅管理员）' })
  findAllForAdmin() {
    return this.announcementsService.findAllForAdmin();
  }

  @Get()
  @ApiOperation({ summary: '获取已发布公告列表（玩家可见；传 position 按展示位置过滤，不传则返回全部）' })
  findAll(@Query('position') position?: string) {
    const pos =
      position && Object.values(AnnouncementPosition).includes(position as AnnouncementPosition)
        ? (position as AnnouncementPosition)
        : undefined;
    return this.announcementsService.findPublic(pos);
  }

  @Get('latest')
  @ApiOperation({ summary: '获取最新公告（首页用）' })
  getLatest(
    @Query('limit') limit?: string,
    @Query('position') position?: string,
  ) {
    const pos =
      position && Object.values(AnnouncementPosition).includes(position as AnnouncementPosition)
        ? (position as AnnouncementPosition)
        : AnnouncementPosition.HOME;
    return this.announcementsService.getLatest(limit ? parseInt(limit, 10) : 3, pos);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取公告详情' })
  async findOne(@Param('id') id: string) {
    const announcement: Announcement = await this.announcementsService.findOne(+id);
    const now = new Date();
    const isVisible =
      announcement.isActive &&
      (!announcement.publishAt || announcement.publishAt <= now) &&
      (!announcement.endAt || announcement.endAt >= now);
    if (!isVisible) {
      throw new ForbiddenException('该公告暂不可见');
    }
    return announcement;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新公告（仅管理员）' })
  update(@Param('id') id: string, @Body() updateAnnouncementDto: UpdateAnnouncementDto) {
    return this.announcementsService.update(+id, updateAnnouncementDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除公告（仅管理员）' })
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(+id);
  }
}
