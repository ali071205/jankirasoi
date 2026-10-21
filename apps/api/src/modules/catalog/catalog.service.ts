import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ToggleSoldOutDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicCatalog(serviceDateString?: string) {
    const serviceDate = serviceDateString ? new Date(serviceDateString) : new Date();

    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            variants: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
            },
            addonGroups: {
              include: {
                addonGroup: {
                  include: {
                    options: {
                      where: { isActive: true },
                    },
                  },
                },
              },
            },
            availabilities: {
              where: { serviceDate },
            },
          },
        },
      },
    });

    return {
      serviceDate: serviceDate.toISOString().split('T')[0],
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        displayOrder: cat.displayOrder,
        items: cat.products.map((p) => {
          const avail = p.availabilities[0];
          const isSoldOut = avail ? avail.isSoldOut : false;
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            dietaryType: p.dietaryType,
            imageUrl: p.imageUrl,
            basePricePaise: p.basePricePaise,
            taxRatePercent: p.taxRatePercent,
            isSoldOut,
            variants: p.variants.map((v) => ({
              id: v.id,
              name: v.name,
              priceModifierPaise: v.priceModifierPaise,
              isDefault: v.isDefault,
            })),
            addonGroups: p.addonGroups.map((ag) => ({
              id: ag.addonGroup.id,
              name: ag.addonGroup.name,
              minSelections: ag.addonGroup.minSelections,
              maxSelections: ag.addonGroup.maxSelections,
              options: ag.addonGroup.options.map((o) => ({
                id: o.id,
                name: o.name,
                pricePaise: o.pricePaise,
              })),
            })),
          };
        }),
      })),
    };
  }

  async createProduct(dto: CreateProductDto) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        dietaryType: dto.dietaryType as any,
        imageUrl: dto.imageUrl,
        basePricePaise: dto.basePricePaise,
        taxRatePercent: dto.taxRatePercent ?? 5,
        variants: {
          create: {
            name: 'Standard Portion',
            priceModifierPaise: 0,
            isDefault: true,
          },
        },
      },
    });
  }

  async toggleSoldOut(productId: string, dto: ToggleSoldOutDto) {
    const serviceDate = new Date(dto.serviceDate);
    return this.prisma.productServiceDateAvailability.upsert({
      where: {
        productId_serviceDate: {
          productId,
          serviceDate,
        },
      },
      update: {
        isSoldOut: dto.isSoldOut,
      },
      create: {
        productId,
        serviceDate,
        isSoldOut: dto.isSoldOut,
      },
    });
  }
}
