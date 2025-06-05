import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VersionsService } from './versions.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseFilterDto } from './dto/release-filter.dto';
import { AddIssueToReleaseDto } from './dto/add-issue-to-release.dto';

@Controller('versions')
@UseGuards(JwtAuthGuard)
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createReleaseDto: CreateReleaseDto) {
    return this.versionsService.create(createReleaseDto);
  }

  @Get()
  async findAll(@Query() filters: ReleaseFilterDto) {
    return this.versionsService.findAll(filters);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.versionsService.getAnalytics();
  }

  @Get('latest')
  async getLatest(@Query('limit') limit?: number) {
    return this.versionsService.getLatestReleases(limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.versionsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateReleaseDto: UpdateReleaseDto) {
    return this.versionsService.update(id, updateReleaseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.versionsService.remove(id);
  }

  @Post(':id/issues')
  async addIssue(@Param('id') id: string, @Body() addIssueDto: AddIssueToReleaseDto) {
    return this.versionsService.addIssue(id, addIssueDto.issueId);
  }

  @Delete(':id/issues/:issueId')
  async removeIssue(@Param('id') id: string, @Param('issueId') issueId: string) {
    return this.versionsService.removeIssue(id, issueId);
  }
}
