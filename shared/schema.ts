import { z } from "zod";

// Restaurant data from Google Places API
export const restaurantSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  rating: z.number().optional(),
  price_level: z.number().min(1).max(4).optional(),
  types: z.array(z.string()).optional(),
  formatted_address: z.string().optional(),
  geometry: z.object({
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  opening_hours: z.object({
    open_now: z.boolean().optional(),
  }).optional(),
  photos: z.array(z.object({
    photo_reference: z.string(),
  })).optional(),
  user_ratings_total: z.number().optional(),
});

// User search settings
export const searchSettingsSchema = z.object({
  radius: z.number().min(0.5).max(10).default(2.0),
  distanceUnit: z.enum(["miles", "kilometers"]).default("miles"),
  priceLevel: z.array(z.number().min(1).max(4)).default([1, 2, 3, 4]),
  priceDisplayMode: z.enum(["symbols", "descriptive"]).default("symbols"),
  cuisines: z.array(z.string()).default([]),
  openNow: z.boolean().default(true),
  highRating: z.boolean().default(false),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

// API request/response schemas
export const searchRestaurantsSchema = z.object({
  settings: searchSettingsSchema,
});

export const searchRestaurantsResponseSchema = z.object({
  restaurant: restaurantSchema.nullable(),
  error: z.string().optional(),
});

export type Restaurant = z.infer<typeof restaurantSchema>;
export type SearchSettings = z.infer<typeof searchSettingsSchema>;
export type SearchRestaurantsRequest = z.infer<typeof searchRestaurantsSchema>;
export type SearchRestaurantsResponse = z.infer<typeof searchRestaurantsResponseSchema>;
