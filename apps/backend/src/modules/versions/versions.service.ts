import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseFilterDto } from './dto/release-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VersionsService {
  constructor(private prisma: PrismaService) {}

  async create(createReleaseDto: CreateReleaseDto) {
    // Check if version already exists
    const existingRelease = await this.prisma.release.findUnique({
      where: { version: createReleaseDto.version },
    });

    if (existingRelease) {
      throw new BadRequestException(`Release version ${createReleaseDto.version} already exists`);
    }

    return this.prisma.release.create({
      data: {
        ...createReleaseDto,
        releaseDate: new Date(createReleaseDto.releaseDate),
      },
      include: {
        issues: {
          include: {
            issue: {
              include: {
                reporter: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                assignee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findAll(filters: ReleaseFilterDto) {
    const {
      search,
      isPrerelease,
      releasedAfter,
      releasedBefore,
      page = 1,
      limit = 10,
      sortBy = 'releaseDate',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.ReleaseWhereInput = {};

    if (search) {
      where.OR = [
        { version: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isPrerelease !== undefined) {
      where.isPrerelease = isPrerelease;
    }

    if (releasedAfter) {
      where.releaseDate = { ...where.releaseDate, gte: new Date(releasedAfter) };
    }

    if (releasedBefore) {
      where.releaseDate = { ...where.releaseDate, lte: new Date(releasedBefore) };
    }

    const skip = (page - 1) * limit;

    const [releases, total] = await Promise.all([
      this.prisma.release.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          issues: {
            include: {
              issue: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  priority: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.release.count({ where }),
    ]);

    return {
      data: releases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const release = await this.prisma.release.findUnique({
      where: { id },
      include: {
        issues: {
          include: {
            issue: {
              include: {
                reporter: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                assignee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!release) {
      throw new NotFoundException(`Release with ID ${id} not found`);
    }

    return release;
  }

  async update(id: string, updateReleaseDto: UpdateReleaseDto) {
    const existingRelease = await this.prisma.release.findUnique({
      where: { id },
    });

    if (!existingRelease) {
      throw new NotFoundException(`Release with ID ${id} not found`);
    }

    // Check if version already exists (if version is being updated)
    if (updateReleaseDto.version && updateReleaseDto.version !== existingRelease.version) {
      const duplicateRelease = await this.prisma.release.findUnique({
        where: { version: updateReleaseDto.version },
      });

      if (duplicateRelease) {
        throw new BadRequestException(`Release version ${updateReleaseDto.version} already exists`);
      }
    }

    const updateData = {
      ...updateReleaseDto,
    };

    if (updateReleaseDto.releaseDate) {
      updateData.releaseDate = new Date(updateReleaseDto.releaseDate);
    }

    return this.prisma.release.update({
      where: { id },
      data: updateData,
      include: {
        issues: {
          include: {
            issue: {
              include: {
                reporter: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                assignee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const release = await this.prisma.release.findUnique({
      where: { id },
    });

    if (!release) {
      throw new NotFoundException(`Release with ID ${id} not found`);
    }

    await this.prisma.release.delete({
      where: { id },
    });

    return { message: 'Release deleted successfully' };
  }

  async addIssue(releaseId: string, issueId: string) {
    // Check if release exists
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
    });

    if (!release) {
      throw new NotFoundException(`Release with ID ${releaseId} not found`);
    }

    // Check if issue exists
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    // Check if issue is already linked to this release
    const existingLink = await this.prisma.releaseIssue.findUnique({
      where: {
        releaseId_issueId: {
          releaseId,
          issueId,
        },
      },
    });

    if (existingLink) {
      throw new BadRequestException('Issue is already linked to this release');
    }

    return this.prisma.releaseIssue.create({
      data: {
        releaseId,
        issueId,
      },
      include: {
        issue: {
          select: {
            id: true,
            title: true,
            type: true,
            priority: true,
            status: true,
          },
        },
      },
    });
  }

  async removeIssue(releaseId: string, issueId: string) {
    const existingLink = await this.prisma.releaseIssue.findUnique({
      where: {
        releaseId_issueId: {
          releaseId,
          issueId,
        },
      },
    });

    if (!existingLink) {
      throw new NotFoundException('Issue is not linked to this release');
    }

    await this.prisma.releaseIssue.delete({
      where: {
        releaseId_issueId: {
          releaseId,
          issueId,
        },
      },
    });

    return { message: 'Issue removed from release successfully' };
  }

  async getAnalytics() {
    const [
      totalReleases,
      prereleases,
      recentReleases,
      issuesInReleases,
      releasesByMonth,
    ] = await Promise.all([
      this.prisma.release.count(),
      this.prisma.release.count({ where: { isPrerelease: true } }),
      this.prisma.release.count({
        where: {
          releaseDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.releaseIssue.count(),
      this.getReleasesByMonth(),
    ]);

    return {
      totalReleases,
      prereleases,
      stableReleases: totalReleases - prereleases,
      recentReleases,
      issuesInReleases,
      releasesByMonth,
    };
  }

  private async getReleasesByMonth() {
    const releases = await this.prisma.release.findMany({
      select: {
        releaseDate: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
      take: 100, // Get last 100 releases
    });

    const monthlyData = releases.reduce((acc, release) => {
      const month = release.releaseDate.toISOString().substring(0, 7); // YYYY-MM format
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getLatestReleases(limit: number = 5) {
    return this.prisma.release.findMany({
      take: limit,
      orderBy: {
        releaseDate: 'desc',
      },
      include: {
        issues: {
          include: {
            issue: {
              select: {
                id: true,
                title: true,
                type: true,
                priority: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }
}
