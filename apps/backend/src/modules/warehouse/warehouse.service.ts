import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { StockAlertDto } from './dto/stock-alert.dto';
import { Prisma, InventoryItem, StockMovement, StockMovementType } from '@prisma/client';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  // Inventory Item Management
  async createInventoryItem(createItemDto: CreateInventoryItemDto, userId: string): Promise<InventoryItem> {
    // Generate SKU if not provided
    const sku = createItemDto.sku || await this.generateSKU(createItemDto.name);

    const item = await this.prisma.inventoryItem.create({
      data: {
        ...createItemDto,
        sku,
        createdById: userId,
      },
      include: {
        category: true,
        location: true,
        supplier: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create initial stock movement
    if (createItemDto.currentStock > 0) {
      await this.createStockMovement({
        inventoryItemId: item.id,
        type: StockMovementType.STOCK_IN,
        quantity: createItemDto.currentStock,
        reason: 'Initial stock',
        userId,
      });
    }

    return item;
  }

  async updateInventoryItem(id: string, updateItemDto: UpdateInventoryItemDto, userId: string): Promise<InventoryItem> {
    const existingItem = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      throw new NotFoundException('Inventory item not found');
    }

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...updateItemDto,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        location: true,
        supplier: true,
      },
    });

    return item;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (item.currentStock > 0) {
      throw new BadRequestException('Cannot delete item with current stock');
    }

    await this.prisma.inventoryItem.delete({
      where: { id },
    });
  }

  async getInventoryItems(filterDto: InventoryFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      locationId,
      supplierId,
      lowStock,
      sortBy = 'name',
      sortOrder = 'asc',
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(locationId && { locationId }),
      ...(supplierId && { supplierId }),
      ...(lowStock && {
        currentStock: {
          lte: this.prisma.inventoryItem.fields.minStockLevel,
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          location: true,
          supplier: true,
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getInventoryItemById(id: string): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        supplier: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        stockMovements: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return item;
  }

  // Stock Management
  async adjustStock(itemId: string, stockMovementDto: StockMovementDto, userId: string): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const { type, quantity, reason, referenceNumber } = stockMovementDto;

    // Calculate new stock level
    let newStock = item.currentStock;
    if (type === StockMovementType.STOCK_IN) {
      newStock += quantity;
    } else if (type === StockMovementType.STOCK_OUT) {
      if (quantity > item.currentStock) {
        throw new BadRequestException('Insufficient stock available');
      }
      newStock -= quantity;
    } else if (type === StockMovementType.ADJUSTMENT) {
      newStock = quantity; // For adjustments, quantity is the new total
    }

    // Update item stock
    const updatedItem = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        currentStock: newStock,
        lastStockUpdate: new Date(),
      },
      include: {
        category: true,
        location: true,
        supplier: true,
      },
    });

    // Create stock movement record
    await this.createStockMovement({
      inventoryItemId: itemId,
      type,
      quantity: type === StockMovementType.ADJUSTMENT ? Math.abs(quantity - item.currentStock) : quantity,
      reason,
      referenceNumber,
      userId,
      previousStock: item.currentStock,
      newStock,
    });

    // Check for low stock alerts
    if (newStock <= item.minStockLevel) {
      await this.createLowStockAlert(itemId, newStock, item.minStockLevel, userId);
    }

    return updatedItem;
  }

  async getStockMovements(itemId?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      ...(itemId && { inventoryItemId: itemId }),
    };

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Stock Alerts
  async getLowStockAlerts(resolved?: boolean) {
    const where: Prisma.StockAlertWhereInput = {
      ...(resolved !== undefined && { resolved }),
    };

    return this.prisma.stockAlert.findMany({
      where,
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true,
            minStockLevel: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveStockAlert(alertId: string, userId: string) {
    return this.prisma.stockAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
    });
  }

  // Analytics
  async getWarehouseStats() {
    const [
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      pendingAlerts,
      recentMovements,
    ] = await Promise.all([
      this.prisma.inventoryItem.count(),
      this.prisma.inventoryItem.aggregate({
        _sum: {
          currentStock: true,
        },
      }),
      this.prisma.inventoryItem.count({
        where: {
          currentStock: {
            lte: this.prisma.inventoryItem.fields.minStockLevel,
          },
        },
      }),
      this.prisma.inventoryItem.count({
        where: { currentStock: 0 },
      }),
      this.prisma.stockAlert.count({
        where: { resolved: false },
      }),
      this.prisma.stockMovement.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalItems,
      totalStockValue: totalValue._sum.currentStock || 0,
      lowStockItems,
      outOfStockItems,
      pendingAlerts,
      recentMovements,
    };
  }

  async getStockLevelsOverTime(itemId: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.prisma.stockMovement.findMany({
      where: {
        inventoryItemId: itemId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        newStock: true,
        type: true,
        quantity: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Categories and Suppliers
  async getCategories() {
    return this.prisma.inventoryCategory.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSuppliers() {
    return this.prisma.supplier.findMany({
      include: {
        _count: {
          select: { inventoryItems: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // Helper methods
  private async generateSKU(name: string): Promise<string> {
    const prefix = name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');

    return `${prefix}-${timestamp}-${random}`;
  }

  private async createStockMovement(data: {
    inventoryItemId: string;
    type: StockMovementType;
    quantity: number;
    reason?: string;
    referenceNumber?: string;
    userId: string;
    previousStock?: number;
    newStock?: number;
  }) {
    return this.prisma.stockMovement.create({
      data: {
        inventoryItemId: data.inventoryItemId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        referenceNumber: data.referenceNumber,
        userId: data.userId,
        previousStock: data.previousStock,
        newStock: data.newStock,
      },
    });
  }

  private async createLowStockAlert(
    itemId: string,
    currentStock: number,
    minLevel: number,
    userId: string,
  ) {
    // Check if there's already an unresolved alert for this item
    const existingAlert = await this.prisma.stockAlert.findFirst({
      where: {
        inventoryItemId: itemId,
        resolved: false,
      },
    });

    if (!existingAlert) {
      await this.prisma.stockAlert.create({
        data: {
          inventoryItemId: itemId,
          message: `Stock level (${currentStock}) is below minimum threshold (${minLevel})`,
          currentStock,
          minLevel,
          createdById: userId,
        },
      });
    }
  }
}
