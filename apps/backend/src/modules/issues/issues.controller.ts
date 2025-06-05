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
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueFilterDto } from './dto/issue-filter.dto';
import { AssignIssueDto } from './dto/assign-issue.dto';
import { AddCommentDto } from './dto/add-comment.dto';

@Controller('issues')
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createIssueDto: CreateIssueDto, @Request() req) {
    return this.issuesService.create(createIssueDto, req.user.id);
  }

  @Get()
  async findAll(@Query() filters: IssueFilterDto) {
    return this.issuesService.findAll(filters);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.issuesService.getAnalytics();
  }

  @Get('by-status')
  async getIssuesByStatus() {
    return this.issuesService.getIssuesByStatus();
  }

  @Get('by-priority')
  async getIssuesByPriority() {
    return this.issuesService.getIssuesByPriority();
  }

  @Get('by-type')
  async getIssuesByType() {
    return this.issuesService.getIssuesByType();
  }

  @Get('labels')
  async getAllLabels() {
    return this.issuesService.getAllLabels();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateIssueDto: UpdateIssueDto) {
    return this.issuesService.update(id, updateIssueDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.issuesService.remove(id);
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() assignIssueDto: AssignIssueDto) {
    return this.issuesService.assign(id, assignIssueDto.assigneeId);
  }

  @Post(':id/unassign')
  async unassign(@Param('id') id: string) {
    return this.issuesService.unassign(id);
  }

  @Post(':id/close')
  async close(@Param('id') id: string) {
    return this.issuesService.close(id);
  }

  @Post(':id/reopen')
  async reopen(@Param('id') id: string) {
    return this.issuesService.reopen(id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @Request() req,
  ) {
    return this.issuesService.addComment(id, addCommentDto.content, req.user.id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.issuesService.getComments(id);
  }

  @Post(':id/labels')
  async addLabel(@Param('id') id: string, @Body() body: { label: string }) {
    return this.issuesService.addLabel(id, body.label);
  }

  @Delete(':id/labels/:label')
  async removeLabel(@Param('id') id: string, @Param('label') label: string) {
    return this.issuesService.removeLabel(id, label);
  }
}
