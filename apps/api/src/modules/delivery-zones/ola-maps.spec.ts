import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OlaMapsService } from './ola-maps.service';

describe('OlaMapsService', () => {
  let service: OlaMapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OlaMapsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OLA_MAPS_API_KEY') return null; // test fallback
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OlaMapsService>(OlaMapsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return local presets for Sagore / Pithampur queries in fallback mode', async () => {
    const results = await service.autocomplete('Chatrachhaya');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].mainText).toContain('Chatrachhaya');
    expect(results[0].pincode).toBe('454774');
  });

  it('should return reverse geocoding result with proper Sagore fallback structure', async () => {
    const result = await service.reverseGeocode(22.6288, 75.5684);
    expect(result).toBeDefined();
    expect(result.lat).toBeCloseTo(22.6288, 3);
    expect(result.lng).toBeCloseTo(75.5684, 3);
    expect(result.formattedAddress).toBeDefined();
  });

  it('should calculate directions with sensible road distance estimate in fallback mode', async () => {
    // Distance from Sagore kitchen (22.6288, 75.5684) to Pithampur Sec 1 (22.6085, 75.5921)
    const result = await service.getDirections(22.6288, 75.5684, 22.6085, 75.5921);
    expect(result.distanceKm).toBeGreaterThan(1);
    expect(result.distanceKm).toBeLessThan(10);
    expect(result.coordinates.length).toBeGreaterThanOrEqual(2);
  });

  it('should preserve and return coordinates safely in snapToRoad fallback', async () => {
    const rawCoords: [number, number][] = [
      [22.6288, 75.5684],
      [22.6291, 75.569],
    ];
    const snapped = await service.snapToRoad(rawCoords);
    expect(snapped.length).toBe(2);
    expect(snapped[0][0]).toBeCloseTo(22.6288, 4);
  });

  it('should optimize route sequence for multi-stop delivery using greedy TSP in fallback mode', async () => {
    const origin = { lat: 22.6288, lng: 75.5684 }; // Sagore Kitchen
    const stops = [
      { id: 'stop-far', lat: 22.5534, lng: 75.7634, title: 'Mhow' }, // ~13km away
      { id: 'stop-near', lat: 22.6254, lng: 75.5642, title: 'Chatrachhaya' }, // ~0.5km away
      { id: 'stop-mid', lat: 22.6085, lng: 75.5921, title: 'Sector 1' }, // ~2.5km away
    ];

    const result = await service.optimizeRoute(origin, stops);
    expect(result.orderedStops.length).toBe(3);
    // Nearest neighbor should pick stop-near first, then stop-mid, then stop-far
    expect(result.orderedStops[0].id).toBe('stop-near');
    expect(result.orderedStops[1].id).toBe('stop-mid');
    expect(result.orderedStops[2].id).toBe('stop-far');
    expect(result.totalDistanceKm).toBeGreaterThan(5);
  });

  it('should initialize with OLAMAPS_API_KEY and gracefully recover from 401 errors', async () => {
    const moduleWithKey: TestingModule = await Test.createTestingModule({
      providers: [
        OlaMapsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OLAMAPS_API_KEY') return 'test_key_sample';
              return null;
            }),
          },
        },
      ],
    }).compile();

    const serviceWithKey = moduleWithKey.get<OlaMapsService>(OlaMapsService);
    expect(serviceWithKey).toBeDefined();

    // Mock global fetch to simulate a 401 Unauthorized response from Ola
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => '{"message":"Unauthorized"}',
    } as any);

    try {
      const results = await serviceWithKey.autocomplete('Sector 1');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].mainText).toContain('Sector 1');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

