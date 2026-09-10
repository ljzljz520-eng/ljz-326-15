import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';

/**
 * 更新公告 DTO：继承 CreateAnnouncementDto 的全部校验规则，
 * 所有字段变为可选。注意必须使用 @nestjs/swagger 的 PartialType
 * （而非 TypeScript 内置的 Partial 类型），否则运行时拿不到
 * class-validator 元数据，ValidationPipe 会跳过校验。
 */
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
