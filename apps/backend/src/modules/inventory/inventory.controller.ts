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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { InventoryService } from './inventory.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetFilterDto } from './dto/asset-filter.dto';
import { MaintenanceScheduleDto } from './dto/maintenance-schedule.dto';
import { AssetAssignmentDto } from './dto/asset-assignment.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Dashboard Stats
  @Get('stats')
  @Permissions('inventory:read')
  async getInventoryStats() {
    return this.inventoryService.getInventoryStats();
  }

  @Get('stats/categories')
  @Permissions('inventory:read')
  async getAssetsByCategory() {
    return this.inventoryService.getAssetsByCategory();
  }

  // Asset Management
  @Get('assets')
  @Permissions('assets:read')
  async getAssets(@Query() filterDto: AssetFilterDto) {
    return this.inventoryService.getAssets(filterDto);
  }

  @Get('assets/:id')
  @Permissions('assets:read')
  async getAssetById(@Param('id') id: string) {
    return this.inventoryService.getAssetById(id);
  }

  @Post('assets')
  @Permissions('assets:create')
  async createAsset(@Body() createAssetDto: CreateAssetDto, @Request() req) {
    return this.inventoryService.createAsset(createAssetDto, req.user.sub);
  }

  @Put('assets/:id')
  @Permissions('assets:update')
  async updateAsset(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @Request() req,
  ) {
    return this.inventoryService.updateAsset(id, updateAssetDto, req.user.sub);
  }

  @Delete('assets/:id')
  @Permissions('assets:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAsset(@Param('id') id: string, @Request() req) {
    await this.inventoryService.deleteAsset(id, req.user.sub);
  }

  // Asset Assignment
  @Put('assets/:id/assign')
  @Permissions('assets:assign')
  async assignAsset(
    @Param('id') id: string,
    @Body() assignmentDto: AssetAssignmentDto,
    @Request() req,
  ) {
    return this.inventoryService.assignAsset(id, assignmentDto.assignedToId, req.user.sub);
  }

  @Put('assets/:id/unassign')
  @Permissions('assets:assign')
  async unassignAsset(@Param('id') id: string, @Request() req) {
    return this.inventoryService.unassignAsset(id, req.user.sub);
  }

  // Maintenance
  @Get('maintenance')
  @Permissions('maintenance:read')
  async getMaintenanceSchedules(
    @Query('assetId') assetId?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.inventoryService.getMaintenanceSchedules(
      assetId,
      upcoming === 'true',
    );
  }

  @Post('maintenance')
  @Permissions('maintenance:create')
  async scheduleMainenance(
    @Body() maintenanceDto: MaintenanceScheduleDto,
    @Request() req,
  ) {
    return this.inventoryService.scheduleMainenance(maintenanceDto, req.user.sub);
  }

  // Categories and Locations
  @Get('categories')
  @Permissions('inventory:read')
  async getCategories() {
    return this.inventoryService.getCategories();
  }

  @Get('locations')
  @Permissions('inventory:read')
  async getLocations() {
    return this.inventoryService.getLocations();
  }
}
