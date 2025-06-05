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
import { WarehouseService } from './warehouse.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { StockMovementDto } from './dto/stock-movement.dto';

@Controller('warehouse')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // Dashboard Stats
  @Get('stats')
  @Permissions('warehouse:read')
  async getWarehouseStats() {
    return this.warehouseService.getWarehouseStats();
  }

  // Inventory Items
  @Get('items')
  @Permissions('inventory:read')
  async getInventoryItems(@Query() filterDto: InventoryFilterDto) {
    return this.warehouseService.getInventoryItems(filterDto);
  }

  @Get('items/:id')
  @Permissions('inventory:read')
  async getInventoryItemById(@Param('id') id: string) {
    return this.warehouseService.getInventoryItemById(id);
  }

  @Post('items')
  @Permissions('inventory:create')
  async createInventoryItem(@Body() createItemDto: CreateInventoryItemDto, @Request() req) {
    return this.warehouseService.createInventoryItem(createItemDto, req.user.sub);
  }

  @Put('items/:id')
  @Permissions('inventory:update')
  async updateInventoryItem(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateInventoryItemDto,
    @Request() req,
  ) {
    return this.warehouseService.updateInventoryItem(id, updateItemDto, req.user.sub);
  }

  @Delete('items/:id')
  @Permissions('inventory:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInventoryItem(@Param('id') id: string) {
    await this.warehouseService.deleteInventoryItem(id);
  }

  // Stock Management
  @Put('items/:id/stock')
  @Permissions('stock:update')
  async adjustStock(
    @Param('id') id: string,
    @Body() stockMovementDto: StockMovementDto,
    @Request() req,
  ) {
    return this.warehouseService.adjustStock(id, stockMovementDto, req.user.sub);
  }

  @Get('stock-movements')
  @Permissions('stock:read')
  async getStockMovements(
    @Query('itemId') itemId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehouseService.getStockMovements(
      itemId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('items/:id/stock-history')
  @Permissions('stock:read')
  async getStockLevelsOverTime(
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.warehouseService.getStockLevelsOverTime(
      id,
      days ? parseInt(days) : 30,
    );
  }

  // Stock Alerts
  @Get('alerts')
  @Permissions('warehouse:read')
  async getLowStockAlerts(@Query('resolved') resolved?: string) {
    return this.warehouseService.getLowStockAlerts(
      resolved ? resolved === 'true' : undefined,
    );
  }

  @Put('alerts/:id/resolve')
  @Permissions('warehouse:update')
  async resolveStockAlert(@Param('id') id: string, @Request() req) {
    return this.warehouseService.resolveStockAlert(id, req.user.sub);
  }

  // Categories and Suppliers
  @Get('categories')
  @Permissions('warehouse:read')
  async getCategories() {
    return this.warehouseService.getCategories();
  }

  @Get('suppliers')
  @Permissions('warehouse:read')
  async getSuppliers() {
    return this.warehouseService.getSuppliers();
  }
}
