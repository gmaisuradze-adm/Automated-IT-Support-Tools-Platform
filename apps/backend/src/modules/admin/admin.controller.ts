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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SystemSettingsDto } from './dto/system-settings.dto';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard Stats
  @Get('dashboard/stats')
  @Permissions('admin:read')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // User Management
  @Get('users')
  @Permissions('users:read')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
  }

  @Post('users')
  @Permissions('users:create')
  async createUser(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.adminService.createUser(createUserDto, req.user.sub);
  }

  @Put('users/:id')
  @Permissions('users:update')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.adminService.updateUser(id, updateUserDto, req.user.sub);
  }

  @Delete('users/:id')
  @Permissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Request() req) {
    await this.adminService.deleteUser(id, req.user.sub);
  }

  // Role Management
  @Get('roles')
  @Permissions('roles:read')
  async getAllRoles() {
    return this.adminService.getAllRoles();
  }

  @Post('roles')
  @Permissions('roles:create')
  async createRole(@Body() createRoleDto: CreateRoleDto, @Request() req) {
    const { name, description, permissionIds } = createRoleDto;
    return this.adminService.createRole(name, description, permissionIds, req.user.sub);
  }

  @Put('roles/:id')
  @Permissions('roles:update')
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req,
  ) {
    const { name, description, permissionIds } = updateRoleDto;
    return this.adminService.updateRole(id, name, description, permissionIds, req.user.sub);
  }

  @Delete('roles/:id')
  @Permissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string, @Request() req) {
    await this.adminService.deleteRole(id, req.user.sub);
  }

  // Permissions
  @Get('permissions')
  @Permissions('permissions:read')
  async getAllPermissions() {
    return this.adminService.getAllPermissions();
  }

  // System Settings
  @Get('settings')
  @Permissions('settings:read')
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Put('settings')
  @Permissions('settings:update')
  async updateSystemSettings(
    @Body() systemSettingsDto: SystemSettingsDto,
    @Request() req,
  ) {
    return this.adminService.updateSystemSettings(systemSettingsDto, req.user.sub);
  }

  // Audit Logs
  @Get('audit-logs')
  @Permissions('audit:read')
  async getAuditLogs(@Query() filterDto: AuditLogFilterDto) {
    return this.adminService.getAuditLogs(filterDto);
  }
}
