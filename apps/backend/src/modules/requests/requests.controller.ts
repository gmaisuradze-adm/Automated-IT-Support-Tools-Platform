import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestFilterDto } from './dto/request-filter.dto';
import { AssignRequestDto } from './dto/assign-request.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@Controller('requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Permissions('requests:create')
  async createRequest(@Body() createRequestDto: CreateRequestDto, @Request() req) {
    return this.requestsService.createRequest(createRequestDto, req.user.id);
  }

  @Get()
  @Permissions('requests:read')
  async getRequests(@Query() filterDto: RequestFilterDto, @Request() req) {
    return this.requestsService.getRequests(filterDto, req.user.id);
  }

  @Get('my-requests')
  @Permissions('requests:read')
  async getMyRequests(@Query() filterDto: RequestFilterDto, @Request() req) {
    const filter = { ...filterDto, requesterId: req.user.id };
    return this.requestsService.getRequests(filter, req.user.id);
  }

  @Get('assigned-to-me')
  @Permissions('requests:read')
  async getAssignedRequests(@Query() filterDto: RequestFilterDto, @Request() req) {
    const filter = { ...filterDto, assigneeId: req.user.id };
    return this.requestsService.getRequests(filter, req.user.id);
  }

  @Get('stats')
  @Permissions('requests:read')
  async getRequestStats(@Request() req) {
    return this.requestsService.getRequestStats(req.user.id);
  }

  @Get('all-stats')
  @Permissions('requests:manage')
  async getAllRequestStats() {
    return this.requestsService.getRequestStats();
  }

  @Get(':id')
  @Permissions('requests:read')
  async getRequestById(@Param('id') id: string) {
    return this.requestsService.getRequestById(id);
  }

  @Put(':id')
  @Permissions('requests:update')
  async updateRequest(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
    @Request() req,
  ) {
    return this.requestsService.updateRequest(id, updateRequestDto, req.user.id);
  }

  @Delete(':id')
  @Permissions('requests:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRequest(@Param('id') id: string, @Request() req) {
    return this.requestsService.deleteRequest(id, req.user.id);
  }

  @Post(':id/assign')
  @Permissions('requests:assign')
  async assignRequest(
    @Param('id') id: string,
    @Body() assignRequestDto: AssignRequestDto,
    @Request() req,
  ) {
    return this.requestsService.assignRequest(id, assignRequestDto, req.user.id);
  }

  @Put(':id/status')
  @Permissions('requests:update')
  async updateRequestStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateRequestStatusDto,
    @Request() req,
  ) {
    return this.requestsService.updateRequestStatus(
      id,
      updateStatusDto.status,
      req.user.id,
      updateStatusDto.notes,
    );
  }

  @Post(':id/comments')
  @Permissions('requests:comment')
  async addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @Request() req,
  ) {
    return this.requestsService.addComment(id, addCommentDto, req.user.id);
  }

  @Get(':id/comments')
  @Permissions('requests:read')
  async getComments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.requestsService.getComments(id, page, limit);
  }

  @Put(':id/workflow/:stepId')
  @Permissions('requests:workflow')
  async updateWorkflowStep(
    @Param('id') requestId: string,
    @Param('stepId') stepId: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.requestsService.updateWorkflowStep(requestId, stepId, data, req.user.id);
  }
}
