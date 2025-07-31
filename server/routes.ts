import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { searchRestaurantsSchema, type Restaurant } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || "";
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || "";

  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("Google Places API key not found. Set GOOGLE_PLACES_API_KEY or GOOGLE_API_KEY environment variable.");
  }

  // Configuration endpoint for frontend
  app.get("/api/config", (req, res) => {
    res.json({
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    });
  });

  // Search for random restaurant
  app.post("/api/restaurants/search", async (req, res) => {
    try {
      if (!GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({ 
          restaurant: null, 
          error: "Google Places API key not configured" 
        });
      }

      const { settings } = searchRestaurantsSchema.parse(req.body);
      
      // Convert radius to meters based on unit
      const radiusMeters = settings.distanceUnit === "miles" 
        ? Math.round(settings.radius * 1609.34)  // miles to meters
        : Math.round(settings.radius * 1000);    // kilometers to meters
      
      // Build search query based on cuisine preferences
      let query = "restaurant";
      if (settings.cuisines.length > 0) {
        query = settings.cuisines.join(" OR ") + " restaurant";
      }

      // Search for restaurants using Google Places Text Search
      const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
      searchUrl.searchParams.set("query", query);
      searchUrl.searchParams.set("location", `${settings.location.lat},${settings.location.lng}`);
      searchUrl.searchParams.set("radius", radiusMeters.toString());
      searchUrl.searchParams.set("type", "restaurant");
      searchUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);
      
      if (settings.openNow) {
        searchUrl.searchParams.set("opennow", "true");
      }

      const response = await fetch(searchUrl.toString());
      const data = await response.json();

      if (data.status !== "OK") {
        return res.status(500).json({ 
          restaurant: null, 
          error: `Google Places API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}` 
        });
      }

      let restaurants = data.results || [];

      // Filter by price level if specified
      if (settings.priceLevel.length < 4) {
        restaurants = restaurants.filter((r: any) => 
          r.price_level && settings.priceLevel.includes(r.price_level)
        );
      }

      // Filter by rating if high rating filter is enabled
      if (settings.highRating) {
        restaurants = restaurants.filter((r: any) => r.rating && r.rating >= 4.0);
      }

      if (restaurants.length === 0) {
        return res.json({ 
          restaurant: null, 
          error: "No restaurants found matching your criteria. Try adjusting your filters." 
        });
      }

      // Select a random restaurant
      const randomIndex = Math.floor(Math.random() * restaurants.length);
      const selectedRestaurant = restaurants[randomIndex];

      // Transform to our schema format
      const restaurant: Restaurant = {
        place_id: selectedRestaurant.place_id,
        name: selectedRestaurant.name,
        rating: selectedRestaurant.rating,
        price_level: selectedRestaurant.price_level,
        types: selectedRestaurant.types,
        formatted_address: selectedRestaurant.formatted_address,
        geometry: selectedRestaurant.geometry,
        opening_hours: selectedRestaurant.opening_hours,
        photos: selectedRestaurant.photos,
        user_ratings_total: selectedRestaurant.user_ratings_total,
      };

      res.json({ restaurant, error: undefined });

    } catch (error) {
      console.error("Error searching restaurants:", error);
      res.status(500).json({ 
        restaurant: null, 
        error: "Failed to search for restaurants. Please try again." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
