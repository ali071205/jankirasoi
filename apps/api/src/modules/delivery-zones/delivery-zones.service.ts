import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PIN_PREFIX_MAP: Record<string, { city: string; district: string; state: string }> = {
  '11': { city: 'New Delhi, Delhi', district: 'South/Central Delhi', state: 'Delhi' },
  '12': { city: 'Gurugram / Faridabad', district: 'Gurugram', state: 'Haryana' },
  '13': { city: 'Ambala / Panipat', district: 'Ambala', state: 'Haryana' },
  '14': { city: 'Amritsar / Jalandhar', district: 'Amritsar', state: 'Punjab' },
  '16': { city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh' },
  '20': { city: 'Noida / Ghaziabad', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '22': { city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh' },
  '24': { city: 'Dehradun', district: 'Dehradun', state: 'Uttarakhand' },
  '30': { city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan' },
  '38': { city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat' },
  '39': { city: 'Surat', district: 'Surat', state: 'Gujarat' },
  '40': { city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra' },
  '41': { city: 'Pune', district: 'Pune', state: 'Maharashtra' },
  '45': { city: 'Indore', district: 'Indore', state: 'Madhya Pradesh' },
  '46': { city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh' },
  '50': { city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana' },
  '56': { city: 'Bengaluru', district: 'Bengaluru', state: 'Karnataka' },
  '60': { city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  '68': { city: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
  '70': { city: 'Kolkata', district: 'Kolkata', state: 'West Bengal' },
  '80': { city: 'Patna', district: 'Patna', state: 'Bihar' },
};

@Injectable()
export class DeliveryZonesService {
  private readonly logger = new Logger(DeliveryZonesService.name);
  private readonly locationCache = new Map<string, { city: string; district: string; state: string }>();

  constructor(private readonly prisma: PrismaService) {}

  private async resolveLocation(pincode: string): Promise<{ city: string; district: string; state: string }> {
    const cached = this.locationCache.get(pincode);
    if (cached) return cached;

    if (pincode === '454774') {
      const sagoreLoc = { city: 'Sagore, Pithampur', district: 'Dhar', state: 'Madhya Pradesh' };
      this.locationCache.set(pincode, sagoreLoc);
      return sagoreLoc;
    }

    // Try resolving via postal pincode API with strict 1.5s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          const district = po.District || '';
          const state = po.State || '';
          const city = district && state && district !== state ? `${district}, ${state}` : (district || state || 'India');
          const loc = { city, district, state };
          this.locationCache.set(pincode, loc);
          return loc;
        }
      }
    } catch {
      // Ignore network / timeout errors and fall back to prefix map
    }

    // Fallback to prefix map
    const prefix2 = pincode.substring(0, 2);
    if (PIN_PREFIX_MAP[prefix2]) {
      const loc = PIN_PREFIX_MAP[prefix2];
      this.locationCache.set(pincode, loc);
      return loc;
    }

    return { city: '', district: '', state: '' };
  }

  async checkPincode(pincode: string) {
    const trimmedPin = pincode.trim();
    const [zone, location] = await Promise.all([
      this.prisma.deliveryZone.findUnique({
        where: { pincode: trimmedPin },
      }),
      this.resolveLocation(trimmedPin),
    ]);

    if (!zone || !zone.isActive) {
      if (trimmedPin === '454774') {
        return {
          serviceable: true,
          zoneId: 'zone-sagore-454774',
          zoneName: 'Sagore / Pithampur Central Zone',
          pincode: '454774',
          city: 'Sagore, Pithampur',
          district: 'Dhar',
          state: 'Madhya Pradesh',
          minOrderPaise: 0,
          deliveryFeePaise: 0,
          freeDeliveryThresholdPaise: 0,
          estimatedDeliveryMinutes: 30,
          message: 'Delivering to Sagore, Pithampur (Free Delivery)',
        };
      }

      return {
        serviceable: false,
        pincode: trimmedPin,
        city: location.city || null,
        district: location.district || null,
        state: location.state || null,
        message: location.city
          ? `We do not deliver to ${location.city} yet. Service currently in Sagore & Delhi NCR.`
          : 'Currently we do not deliver to this pincode.',
      };
    }

    return {
      serviceable: true,
      zoneId: zone.id,
      zoneName: zone.name,
      pincode: zone.pincode,
      city: location.city || 'Delhi',
      district: location.district || 'Delhi',
      state: location.state || 'Delhi',
      minOrderPaise: zone.minOrderPaise,
      deliveryFeePaise: zone.deliveryFeePaise,
      freeDeliveryThresholdPaise: zone.freeDeliveryThresholdPaise,
      estimatedDeliveryMinutes: 45,
      message: `Delivering to ${location.city || zone.name}`,
    };
  }

  async getAllActiveZones() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
    });
  }
}
