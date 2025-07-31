import { type Restaurant, type SearchSettings } from "@shared/schema";

// Storage interface for restaurant data
export interface IStorage {
  // No persistent storage needed for this app
  // All data comes from Google Places API
}

export class MemStorage implements IStorage {
  constructor() {
    // No data to initialize
  }
}

export const storage = new MemStorage();
